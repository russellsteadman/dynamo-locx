import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import GeoTable from "../src";
import { v4 as uuid } from "uuid";

// Use a local DB for the example.
const ddb = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "us-east-1",
});

// Configuration the GeoTable instance
const locx = new GeoTable({
  client: ddb,
  tableName: "capitals",
});

// Construct a CreateTableCommandInput.
const createTableInput = locx.getCreateTableRequest();

console.log("Creating table with schema:");
console.dir(createTableInput, { depth: null });

// Create the table
ddb
  .send(new CreateTableCommand(createTableInput))
  // Wait for it to become ready
  .then(() =>
    waitUntilTableExists(
      { client: ddb, maxWaitTime: 20 },
      { TableName: locx.tableName }
    )
  )

  // Load sample data in batches
  .then(() => {
    console.log("Loading sample data from capitals.json");
    const data = require("./capitals.json");
    const putPointInputs = data.map(function (capital) {
      return {
        RangeKeyValue: { S: uuid.v4() }, // Use this to ensure uniqueness of the hash/range pairs.
        GeoPoint: {
          latitude: capital.latitude,
          longitude: capital.longitude,
        },
        PutItemCommandInput: {
          Item: {
            country: { S: capital.country },
            capital: { S: capital.capital },
          },
        },
      };
    });

    const BATCH_SIZE = 25;
    const WAIT_BETWEEN_BATCHES_MS = 1000;
    var currentBatch = 1;

    function resumeWriting() {
      if (putPointInputs.length === 0) {
        return Promise.resolve();
      }
      const thisBatch = [];
      for (
        var i = 0, itemToAdd = null;
        i < BATCH_SIZE && (itemToAdd = putPointInputs.shift());
        i++
      ) {
        thisBatch.push(itemToAdd);
      }
      console.log(
        "Writing batch " +
          currentBatch++ +
          "/" +
          Math.ceil(data.length / BATCH_SIZE)
      );
      return locx
        .batchWritePoints(thisBatch)
        .then(function () {
          return new Promise(function (resolve) {
            setInterval(resolve, WAIT_BETWEEN_BATCHES_MS);
          });
        })
        .then(function () {
          return resumeWriting();
        });
    }

    return resumeWriting().catch(function (error) {
      console.warn(error);
    });
  })
  // Perform a radius query
  .then(function () {
    console.log("Querying by radius, looking 100km from Cambridge, UK.");
    return locx.queryRadius({
      RadiusInMeter: 100000,
      CenterPoint: {
        latitude: 52.22573,
        longitude: 0.149593,
      },
    });
  })
  // Print the results, an array of DynamoDB.AttributeMaps
  .then(console.log)
  // Clean up
  .then(function () {
    return ddb.send(new DeleteTableCommand({ TableName: locx.tableName }));
  })
  .catch(console.warn)
  .then(function () {
    process.exit(0);
  });
