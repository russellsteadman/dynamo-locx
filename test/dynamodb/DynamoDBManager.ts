import GeoTable from "../../src";
import ava from "ava";
import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

ava(
  "DynamoDBManager.deletePoint calls deleteItem with the correct arguments ",
  (t) => {
    let called = false;
    const locx = new GeoTable({
      client: {
        send: (args: DeleteItemCommand) => {
          called = true;
          t.deepEqual(args.input, {
            TableName: "MyTable",
            Key: {
              hashKey: { N: "44" },
              rangeKey: { S: "1234" },
            },
          });
        },
      } as any as DynamoDBClient,
      tableName: "MyTable",
    });

    locx.deletePoint({
      RangeKeyValue: { S: "1234" },
      GeoPoint: {
        longitude: 50,
        latitude: 1,
      },
    });

    t.is(called, true);
  }
);

ava(
  "DynamoDBManager.putPoint calls putItem with the correct arguments ",
  (t) => {
    let called = false;
    const locx = new GeoTable({
      client: {
        send: (args: PutItemCommand) => {
          called = true;
          t.deepEqual(args.input, {
            TableName: "MyTable",
            Item: {
              geoJson: { S: '{"type":"Point","coordinates":[-0.13,51.51]}' },
              geohash: { N: "5221366118452580119" },
              hashKey: { N: "52" },
              rangeKey: { S: "1234" },
              country: { S: "UK" },
              capital: { S: "London" },
            },
            ConditionExpression: "attribute_not_exists(capital)",
          });
        },
      } as any as DynamoDBClient,
      tableName: "MyTable",
    });

    locx.putPoint({
      RangeKeyValue: { S: "1234" }, // Use this to ensure uniqueness of the hash/range pairs.
      GeoPoint: {
        // An object specifying latitutde and longitude as plain numbers. Used to build the geohash, the hashkey and geojson data
        latitude: 51.51,
        longitude: -0.13,
      },
      PutItemCommandInput: {
        // Passed through to the underlying DynamoDB.putItem request. TableName is filled in for you.
        Item: {
          // The primary key, geohash and geojson data is filled in for you
          country: { S: "UK" }, // Specify attribute values using { type: value } objects, like the DynamoDB API.
          capital: { S: "London" },
        },
        ConditionExpression: "attribute_not_exists(capital)",
      },
    });

    t.is(called, true);
  }
);
