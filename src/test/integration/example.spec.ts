import test from 'ava';
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import GeoTable from '../../index.js';
import data from './capitals.js';

// Use a local DB for the example.
const ddb = new DynamoDBClient({
  endpoint: 'http://127.0.0.1:8000',
  region: 'us-east-1',
});

// Configuration for a new instance of a GeoDataManager. Each GeoDataManager instance represents a table
const locx = new GeoTable({
  client: ddb,
  tableName: 'GeoTableExample',
  hashKeyLength: 3,
  consistentRead: true,
});

test.beforeEach(async () => {
  // Use GeoTableUtil to help construct a CreateTableInput.
  const createTableInput = locx.getCreateTableRequest({
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  });

  await ddb.send(new CreateTableCommand(createTableInput));
  // Wait for it to become ready
  await waitUntilTableExists(
    { client: ddb, maxWaitTime: 30 },
    { TableName: locx.tableName },
  );

  // Load sample data in batches
  console.log('Loading sample data from capitals.json');
  const putPointInputs = data.map(function (capital, i) {
    return {
      RangeKeyValue: { S: String(i) }, // Use this to ensure uniqueness of the hash/range pairs.
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
  let currentBatch = 1;

  while (putPointInputs.length > 0) {
    const thisBatch: Array<(typeof putPointInputs)[0]> = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const itemToAdd = putPointInputs.shift();
      if (!itemToAdd) {
        break;
      }

      thisBatch.push(itemToAdd);
    }

    console.log(
      `Writing batch ${currentBatch++}/${Math.ceil(data.length / BATCH_SIZE)}`,
    );

    // eslint-disable-next-line no-await-in-loop
    await locx.batchWritePoints(thisBatch);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, WAIT_BETWEEN_BATCHES_MS);
    });
  }
});

test('queryRadius', async (t) => {
  t.teardown(teardown);

  // Perform a radius query
  const result = await locx.queryRadius({
    RadiusInMeter: 100_000,
    CenterPoint: {
      latitude: 52.225_73,
      longitude: 0.149_593,
    },
  });

  t.deepEqual(result, [
    {
      rangeKey: { S: '50' },
      country: { S: 'United Kingdom' },
      capital: { S: 'London' },
      hashKey: { N: '522' },
      geoJson: { S: '{"type":"Point","coordinates":[-0.13,51.51]}' },
      geohash: { N: '5221366118452580119' },
    },
  ]);
});

const teardown = async () => {
  await ddb.send(new DeleteTableCommand({ TableName: locx.tableName }));
};
