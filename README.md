# Geo Querying for Amazon DynamoDB

This project is a Node.js location querying library for [Amazon DynamoDB][dynamodb] through geohashing. It is based on AWS's [awslabs/dynamodb-geo][dynamodb-geo] and Rob Hogan's [robhogan/dynamodb-geo.js][dynamodb-geo-js], and it works directly with [AWS DynamoDB SDK][aws-sdk-dynamodb].

## Features

- **Box Queries:** Return all of the items that fall within a pair of geo points that define a rectangle as projected onto a sphere.
- **Radius Queries:** Return all of the items that are within a given radius of a geo point.
- **Basic CRUD Operations:** Create, retrieve, update, and delete geospatial data items.
- **Customizable:** Access to raw request and result objects from the AWS SDK for javascript.
- **Fully Typed:** This port is written in typescript and declaration files are bundled into releases.

## Installation

```sh
npm install dynamo-locx
```

## Getting started

Start by setting up the DynamoDB client. This is the same as you would do for any other DynamoDB application. To test locally, you can run `docker run -p 8000:8000 deangiberson/aws-dynamodb-local` to spin up a local docker instance exposed on port 8000.

Create an instance of `GeoTable` for each geospatial table. This allows you to configure per-table options, but at minimum you must provide a `DynamoDBClient` instance and a table name. See the [configuration reference](#configuration-reference) for more details.

```js
import GeoTable from "dynamo-locx";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({
  endpoint: "http://localhost:8000", // For local development only
  region: "us-east-1",
});

const locx = new GeoTable({
  client: ddb,
  tableName: "MyGeoTable",
  hashKeyLength: 3, // See below for explanation
  // See configuration reference for more options...
});
```

## Choosing a hash key length

The `hashKeyLength` is the number of most significant digits (in base 10) of the 64-bit geo hash to use as the hash key. Larger numbers will allow small geographical areas to be spread across DynamoDB partitions, but at the cost of performance as more [queries][dynamodb-query] need to be executed for box/radius searches that span hash keys. See [these tests][hashkeylength-tests] for an idea of how query performance scales with `hashKeyLength` for different search radii.

If your data is sparse, a large number will mean more RCUs since more empty queries will be executed and each has a minimum cost. However if your data is dense and `hashKeyLength` is too short, more RCUs will be needed to read a hash key and a higher proportion will be discarded by server-side filtering.

From the [AWS `Query` documentation][dynamodb-query]:

> DynamoDB calculates the number of read capacity units consumed based on item size, not on the amount of data that is returned to an application. ... **The number will also be the same whether or not you use a `FilterExpression`**

Optimally, you should pick the largest `hashKeyLength` your usage scenario allows. The wider your typical radius/box queries, the smaller it will need to be. Changing your `hashKeyLength` would require you to recreate your table.

## Creating a GeoTable

`GeoTable` has method `getCreateTableRequest` for to create a [DynamoDB CreateTable request][createtable] request given your configuration. This request can be edited as desired before being sent to DynamoDB.

```js
const createTableInput = locx.getCreateTableRequest();

// Tweak the CreateTableCommandInput as needed
createTableInput.ProvisionedThroughput = { ReadCapacityUnits: 2 };

// Create the table
ddb
  .send(new CreateTableCommand(createTableInput))
  // Wait for it to become ready
  .then(() =>
    waitForTableToBeReady(
      { client: ddb, maxWaitTime: 20 },
      { TableName: locx.tableName }
    )
  )
  .then(() => {
    console.log("Table created and ready!");
  });
```

## Adding a GeoPoint

```js
locx
  .putPoint({
    RangeKeyValue: { S: "1234" }, // Use this to ensure uniqueness of the hash/range pairs
    GeoPoint: {
      // An object specifying latitude and longitude as plain numbers
      // These are used to build the geohash, the hashkey, and geojson data
      latitude: 51.51,
      longitude: -0.13,
    },
    PutItemCommandInput: {
      // Passed through to the underlying PutItem request, TableName is prefilled
      Item: {
        // The primary key, geohash, and geojson data are prefilled
        country: { S: "UK" }, // Specify attribute values using the AttributeValue type
        capital: { S: "London" },
      },
      // ... Anything else to pass through to PutItem request, e.g. ConditionExpression
    },
  })
  .then(function () {
    console.log("Done!");
  });
```

See also [DynamoDB PutItem request][putitem]

## Updating a GeoPoint

The hash key, range key, geohash and geoJson cannot be updated. To change these, recreate the record.

You must specify a `RangeKeyValue`, a `GeoPoint`, and an `UpdateItemCommandInput` matching the [DynamoDB UpdateItem][updateitem] request (`TableName` and `Key` are filled in for you).

```js
locx
  .updatePoint({
    RangeKeyValue: { S: "1234" },
    GeoPoint: {
      // An object specifying latitude and longitude as plain numbers.
      latitude: 51.51,
      longitude: -0.13,
    },
    UpdateItemCommandInput: {
      // TableName and Key are filled in for you
      UpdateExpression: "SET country = :newName",
      ExpressionAttributeValues: {
        ":newName": { S: "United Kingdom" },
      },
    },
  })
  .then(function () {
    console.log("Done!");
  });
```

## Deleting a GeoPoint

You must specify a `RangeKeyValue` and a `GeoPoint`. Optionally, you can pass `DeleteItemInput` matching [DynamoDB DeleteItem][deleteitem] request (`TableName` and `Key` are filled in for you).

```js
locx
  .deletePoint({
    RangeKeyValue: { S: "1234" },
    GeoPoint: {
      // An object specifying latitutde and longitude as plain numbers.
      latitude: 51.51,
      longitude: -0.13,
    },
    DeleteItemCommandInput: {
      // Optional, any additional parameters to pass through.
      // TableName and Key are filled in for you
      // Example: Only delete if the point does not have a country name set
      ConditionExpression: "attribute_not_exists(country)",
    },
  })
  .then(function () {
    console.log("Done!");
  });
```

## Rectangular queries

Query by rectangle by specifying a `MinPoint` and `MaxPoint`.

```js
// Querying a rectangle
locx
  .queryRectangle({
    MinPoint: {
      latitude: 52.22573,
      longitude: 0.149593,
    },
    MaxPoint: {
      latitude: 52.889499,
      longitude: 0.848383,
    },
  })
  // Print the results, an array of DynamoDB.AttributeMaps
  .then(console.log);
```

## Radius queries

Query by radius by specifying a `CenterPoint` and `RadiusInMeter`.

```js
// Querying 100km from Cambridge, UK
locx
  .queryRadius({
    RadiusInMeter: 100000,
    CenterPoint: {
      latitude: 52.22573,
      longitude: 0.149593,
    },
  })
  // Print the results, an array of DynamoDB.AttributeMaps
  .then(console.log);
```

## Batch operations

TODO: Docs (see [the example][example] for an example of a batch write)

## Configuration reference

#### client: DynamoDBClient

(Required) The [DynamoDBClient][dynamodbclient] to use.

#### tableName: string

(Required) The name of the DynamoDB table to use.

#### consistentRead: boolean = false

Whether queries use the [`ConsistentRead`][readconsistency] option (for strongly consistent reads) or not (for eventually consistent reads, at half the cost).

This can also be overridden for individual queries as a query config option.

#### longitudeFirst: boolean = true

This library will automatically add GeoJSON-style position data to your stored items. The [GeoJSON standard][geojson] uses `[lon,lat]` ordering, but [awslabs/dynamodb-geo][dynamodb-geo] uses `[lat,lng]`.

This fork allows you to choose between [awslabs/dynamodb-geo][dynamodb-geo] compatibility and GeoJSON standard compliance.

- Use `false` (`[lat, lon]`) for compatibility with [awslabs/dynamodb-geo][dynamodb-geo]
- Use `true` (`[lon, lat]`) for GeoJSON standard compliance. (default)

Note that this value should match the state of your existing data - if you change it you must update your database manually, or you'll end up with ambiguously mixed data.

#### geoJsonPointType: "Point" | "POINT" = "Point"

The value of the `type` attribute in recorded GeoJSON points. Should normally be `"Point"`, which is standards compliant.

Use `"POINT"` for compatibility with [awslabs/dynamodb-geo][dynamodb-geo].

This setting is only relevant for writes. This library doesn't inspect or set this value when reading/querying.

#### geohashAttributeName: string = "geohash"

The name of the attribute storing the full 64-bit geohash. Its value is auto-generated based on item coordinates.

#### hashKeyAttributeName: string = "hashKey"

The name of the attribute storing the first `hashKeyLength` digits (default 2) of the geo hash, used as the hash (aka partition) part of a [hash/range primary key pair][hashrange]. Its value is auto-generated based on item coordinates.

#### hashKeyLength: number = 2

See [above][choosing-hashkeylength].

#### rangeKeyAttributeName: string = "rangeKey"

The name of the attribute storing the range key, used as the range (aka sort) part of a [hash/range key primary key pair][hashrange]. Its value must be specified by you (hash-range pairs must be unique).

#### geoJsonAttributeName: string = "geoJson"

The name of the attribute which will contain the longitude/latitude pair in a GeoJSON-style point (see also `longitudeFirst`).

#### geohashIndexName: string = "geohash-index"

The name of the index to be created against the geohash. Only used for creating new tables.

## Example

See the [example on Github][example]

## Limitations

### No composite key support

Currently, the library does not support composite keys. You may want to add tags such as restaurant, bar, and coffee shop, and search locations of a specific category; however, it is currently not possible. You need to create a table for each tag and store the items separately.

### Queries retrieve all paginated data

Although low level [DynamoDB Query][dynamodb-query] requests return paginated results, this library automatically pages through the entire result set. When querying a large area with many points, a lot of Read Capacity Units may be consumed.

### More Read Capacity Units

The library retrieves candidate Geo points from the cells that intersect the requested bounds. The library then post-processes the candidate data, filtering out the specific points that are outside the requested bounds. Therefore, the consumed Read Capacity Units will be higher than the final results dataset. Typically 8 queries are executed per radius or box search.

### High memory consumption

Because all paginated `Query` results are loaded into memory and processed, it may consume substantial amounts of memory for large datasets.

### Dataset density limitation

The Geohash used in this library is roughly centimeter precision. Therefore, the library is not suitable if your dataset has much higher density.

## License

Where not otherwise noted, copyright project contributors and licensed under an Apache 2.0 License. See LICENSE for full details.

## Legal Disclaimer

This project is not affiliated with or endorsed by Amazon Technologies, Inc. or any of its affiliates. Amazon and DynamoDB are trademarks of Amazon Technologies, Inc. and used nominatively only.

[npm]: https://www.npmjs.com
[updateitem]: http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
[deleteitem]: http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html
[putitem]: http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
[createtable]: http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html
[hashrange]: http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey
[readconsistency]: http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
[geojson]: https://geojson.org/geojson-spec.html
[example]: https://github.com/russellsteadman/dynamo-locx/tree/main/example
[dynamodb-geo]: https://github.com/awslabs/dynamodb-geo
[dynamodb-geo-js]: https://github.com/robhogan/dynamodb-geo.js
[dynamodb]: http://aws.amazon.com/dynamodb
[dynamodb-query]: http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
[hashkeylength-tests]: https://github.com/russellsteadman/dynamo-locx/blob/main/test/integration/hashKeyLength.ts
[choosing-hashkeylength]: #choosing-a-hashkeylength-optimising-for-performance-and-cost
[aws-sdk-dynamodb]: https://www.npmjs.com/package/@aws-sdk/client-dynamodb
[dynamodbclient]: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html
