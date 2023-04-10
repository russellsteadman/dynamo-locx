import * as ddbGeo from "../../src";
import ava from "ava";
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import data from "../../example/capitals.json";

// Use a local DB for the example.
const ddb = new DynamoDBClient({
  endpoint: "http://127.0.0.1:8000",
  region: "us-east-1",
});

// Configuration for a new instance of a GeoDataManager. Each GeoDataManager instance represents a table
const config = new ddbGeo.GeoDataManagerConfiguration(ddb, "test-capitals");

// Instantiate the table manager
const capitalsManager = new ddbGeo.GeoDataManager(config);

ava.beforeEach(async function () {
  config.hashKeyLength = 3;
  config.consistentRead = true;

  // Use GeoTableUtil to help construct a CreateTableInput.
  const createTableInput = ddbGeo.GeoTableUtil.getCreateTableRequest(config);
  if (createTableInput.ProvisionedThroughput) {
    createTableInput.ProvisionedThroughput.ReadCapacityUnits = 2;
  }

  await ddb.send(new CreateTableCommand(createTableInput));
  // Wait for it to become ready
  await waitUntilTableExists(
    { client: ddb, maxWaitTime: 10000 },
    { TableName: config.tableName }
  );

  // Load sample data in batches
  console.log("Loading sample data from capitals.json");
  const putPointInputs = data.map(function (capital, i) {
    return {
      RangeKeyValue: { S: String(i) }, // Use this to ensure uniqueness of the hash/range pairs.
      GeoPoint: {
        latitude: capital.latitude,
        longitude: capital.longitude,
      },
      PutItemInput: {
        Item: {
          country: { S: capital.country },
          capital: { S: capital.capital },
        },
      },
    };
  });

  const BATCH_SIZE = 25;
  const WAIT_BETWEEN_BATCHES_MS = 1000;
  let currentBatch = 1;

  async function resumeWriting() {
    if (putPointInputs.length === 0) {
      console.log("Finished loading");
      return;
    }
    const thisBatch: typeof putPointInputs[0][] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const itemToAdd = putPointInputs.shift();
      if (!itemToAdd) {
        break;
      }
      thisBatch.push(itemToAdd);
    }
    console.log(
      "Writing batch " +
        currentBatch++ +
        "/" +
        Math.ceil(data.length / BATCH_SIZE)
    );
    await capitalsManager.batchWritePoints(thisBatch);
    // Sleep
    await new Promise((resolve) =>
      setInterval(resolve, WAIT_BETWEEN_BATCHES_MS)
    );
    return resumeWriting();
  }
  return resumeWriting();
});

ava("queryRadius", async (t) => {
  t.teardown(teardown);

  // Perform a radius query
  const result = await capitalsManager.queryRadius({
    RadiusInMeter: 100000,
    CenterPoint: {
      latitude: 52.22573,
      longitude: 0.149593,
    },
  });

  t.deepEqual(result, [
    {
      rangeKey: { S: "50" },
      country: { S: "United Kingdom" },
      capital: { S: "London" },
      hashKey: { N: "522" },
      geoJson: { S: '{"type":"Point","coordinates":[-0.13,51.51]}' },
      geohash: { N: "5221366118452580119" },
    },
  ]);
});

const teardown = async () => {
  await ddb.send(new DeleteTableCommand({ TableName: config.tableName }));
};
