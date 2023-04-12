import {
  CreateTableCommandInput,
  DynamoDBClient,
  PutItemCommandInput,
  QueryCommandInput,
  QueryCommandOutput,
  AttributeValue,
  Condition,
  WriteRequest,
  QueryCommand,
  GetItemCommand,
  PutItemCommand,
  BatchWriteItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  GetItemCommandInput,
  UpdateItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import {
  BatchWritePointOutput,
  DeletePointInput,
  DeletePointOutput,
  GetPointInput,
  GetPointOutput,
  PutPointInput,
  PutPointOutput,
  UpdatePointInput,
  UpdatePointOutput,
  GeoPoint,
  GeoQueryInput,
  QueryRadiusInput,
  QueryRectangleInput,
  ItemList,
  GeoTableConfiguration,
} from "./types";
import { GeohashRange } from "./model/GeohashRange";
import Long from "long";
import { S2LatLng, S2LatLngRect, S2RegionCoverer } from "nodes2ts";
import { Covering } from "./model/Covering";
import { generateGeohash, generateHashKey } from "./s2/S2Manager";
import {
  getBoundingLatLngRectFromQueryRadiusInput,
  latLngRectFromQueryRectangleInput,
} from "./s2/S2Util";

class GeoTable {
  protected client: DynamoDBClient;
  readonly tableName: string;

  protected consistentRead: boolean;
  protected hashKeyAttributeName: string;
  protected rangeKeyAttributeName: string;
  protected geohashAttributeName: string;
  protected geoJsonAttributeName: string;
  protected geohashIndexName: string;
  protected hashKeyLength: number;
  protected longitudeFirst: boolean;
  protected geoJsonPointType: "Point" | "POINT";

  constructor(config: GeoTableConfiguration) {
    this.tableName = config.tableName;
    this.client = config.client;

    this.consistentRead = config.consistentRead ?? false;
    this.hashKeyAttributeName = config.hashKeyAttributeName ?? "hashKey";
    this.rangeKeyAttributeName = config.rangeKeyAttributeName ?? "rangeKey";
    this.geohashAttributeName = config.geohashAttributeName ?? "geohash";
    this.geoJsonAttributeName = config.geoJsonAttributeName ?? "geoJson";
    this.geohashIndexName = config.geohashIndexName ?? "geohash-index";
    this.hashKeyLength = config.hashKeyLength ?? 2;
    this.longitudeFirst = config.longitudeFirst ?? true;
    this.geoJsonPointType = config.geoJsonPointType ?? "Point";
  }

  /**
   * Query the table by geohash for a given range of geohashes
   */
  public async queryGeohash(
    queryInput: Omit<QueryCommandInput, "TableName"> | undefined,
    hashKey: Long,
    range: GeohashRange
  ): Promise<QueryCommandOutput[]> {
    const queryOutputs: QueryCommandOutput[] = [];

    const nextQuery = async (
      lastEvaluatedKey?: Record<string, AttributeValue>
    ): Promise<QueryCommandOutput[]> => {
      const keyConditions: { [key: string]: Condition } = {};

      keyConditions[this.hashKeyAttributeName] = {
        ComparisonOperator: "EQ",
        AttributeValueList: [{ N: hashKey.toString(10) }],
      };

      const minRange: AttributeValue = {
        N: range.rangeMin.toString(10),
      };
      const maxRange: AttributeValue = {
        N: range.rangeMax.toString(10),
      };

      keyConditions[this.geohashAttributeName] = {
        ComparisonOperator: "BETWEEN",
        AttributeValueList: [minRange, maxRange],
      };

      const defaults: QueryCommandInput = {
        TableName: this.tableName,
        KeyConditions: keyConditions,
        IndexName: this.geohashIndexName,
        ConsistentRead: this.consistentRead,
        ReturnConsumedCapacity: "TOTAL",
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const queryOutput = await this.client.send(
        new QueryCommand({
          ...defaults,
          ...queryInput,
        })
      );

      queryOutputs.push(queryOutput);
      if (queryOutput.LastEvaluatedKey) {
        return nextQuery(queryOutput.LastEvaluatedKey);
      }

      return queryOutputs;
    };

    await nextQuery();
    return queryOutputs;
  }

  /**
   * Get a point from the table
   */
  public getPoint(getPointInput: GetPointInput): Promise<GetPointOutput> {
    const geohash = generateGeohash(getPointInput.GeoPoint);
    const hashKey = generateHashKey(geohash, this.hashKeyLength);

    const getItemInput: GetItemCommandInput = {
      ...getPointInput.GetItemCommandInput,
      TableName: this.tableName,
    };

    getItemInput.Key = {
      [this.hashKeyAttributeName]: { N: hashKey.toString(10) },
      [this.rangeKeyAttributeName]: getPointInput.RangeKeyValue,
    };

    return this.client.send(new GetItemCommand(getItemInput));
  }

  /**
   * Put a point into the table
   */
  public putPoint(putPointInput: PutPointInput): Promise<PutPointOutput> {
    const geohash = generateGeohash(putPointInput.GeoPoint);
    const hashKey = generateHashKey(geohash, this.hashKeyLength);
    const putItemInput: PutItemCommandInput = {
      ...putPointInput.PutItemCommandInput,
      TableName: this.tableName,
    };

    const item = putPointInput.PutItemCommandInput.Item ?? {};

    item[this.hashKeyAttributeName] = {
      N: hashKey.toString(10),
    };
    item[this.rangeKeyAttributeName] = putPointInput.RangeKeyValue;
    item[this.geohashAttributeName] = {
      N: geohash.toString(10),
    };

    item[this.geoJsonAttributeName] = {
      S: JSON.stringify({
        type: this.geoJsonPointType,
        coordinates: this.longitudeFirst
          ? [putPointInput.GeoPoint.longitude, putPointInput.GeoPoint.latitude]
          : [putPointInput.GeoPoint.latitude, putPointInput.GeoPoint.longitude],
      }),
    };

    putItemInput.Item = item;

    return this.client.send(new PutItemCommand(putItemInput));
  }

  /**
   * Batch write points into the table
   */
  public batchWritePoints(
    putPointInputs: PutPointInput[]
  ): Promise<BatchWritePointOutput> {
    const writeInputs: WriteRequest[] = [];
    putPointInputs.forEach((putPointInput) => {
      const geohash = generateGeohash(putPointInput.GeoPoint);
      const hashKey = generateHashKey(geohash, this.hashKeyLength);
      const putItemInput = putPointInput.PutItemCommandInput;

      const putRequest: PutItemCommandInput = {
        ...putItemInput,
        TableName: this.tableName,
        Item: putItemInput.Item || {},
      };

      const item = putItemInput.Item ?? {};

      item[this.hashKeyAttributeName] = {
        N: hashKey.toString(10),
      };
      item[this.rangeKeyAttributeName] = putPointInput.RangeKeyValue;
      item[this.geohashAttributeName] = {
        N: geohash.toString(10),
      };
      item[this.geoJsonAttributeName] = {
        S: JSON.stringify({
          type: this.geoJsonPointType,
          coordinates: this.longitudeFirst
            ? [
                putPointInput.GeoPoint.longitude,
                putPointInput.GeoPoint.latitude,
              ]
            : [
                putPointInput.GeoPoint.latitude,
                putPointInput.GeoPoint.longitude,
              ],
        }),
      };

      putRequest.Item = item;

      writeInputs.push({ PutRequest: putRequest });
    });

    return this.client.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [this.tableName]: writeInputs,
        },
      })
    );
  }

  /**
   * Update a point in the table
   */
  public updatePoint(
    updatePointInput: UpdatePointInput
  ): Promise<UpdatePointOutput> {
    const geohash = generateGeohash(updatePointInput.GeoPoint);
    const hashKey = generateHashKey(geohash, this.hashKeyLength);

    const updateItemInput: UpdateItemCommandInput = {
      ...updatePointInput.UpdateItemCommandInput,
      TableName: this.tableName,
    };

    if (!updateItemInput.Key) {
      updateItemInput.Key = {};
    }

    updateItemInput.Key[this.hashKeyAttributeName] = {
      N: hashKey.toString(10),
    };
    updateItemInput.Key[this.rangeKeyAttributeName] =
      updatePointInput.RangeKeyValue;

    // Geohash and geoJson cannot be updated.
    if (updateItemInput.AttributeUpdates) {
      delete updateItemInput.AttributeUpdates[this.geohashAttributeName];
      delete updateItemInput.AttributeUpdates[this.geoJsonAttributeName];
    }

    return this.client.send(new UpdateItemCommand(updateItemInput));
  }

  /**
   * Delete a point from the table
   */
  public deletePoint(
    deletePointInput: DeletePointInput
  ): Promise<DeletePointOutput> {
    const geohash = generateGeohash(deletePointInput.GeoPoint);
    const hashKey = generateHashKey(geohash, this.hashKeyLength);

    return this.client.send(
      new DeleteItemCommand({
        ...deletePointInput.DeleteItemCommandInput,
        TableName: this.tableName,
        Key: {
          [this.hashKeyAttributeName]: { N: hashKey.toString(10) },
          [this.rangeKeyAttributeName]: deletePointInput.RangeKeyValue,
        },
      })
    );
  }

  /**
   * Query a rectangular area constructed by two points and return all points within the area. Two points need to
   * construct a rectangle from minimum and maximum latitudes and longitudes. If minPoint.getLongitude() >
   * maxPoint.getLongitude(), the rectangle spans the 180 degree longitude line.
   */
  public async queryRectangle(
    queryRectangleInput: QueryRectangleInput
  ): Promise<ItemList> {
    const latLngRect: S2LatLngRect =
      latLngRectFromQueryRectangleInput(queryRectangleInput);

    const covering = new Covering(
      new S2RegionCoverer().getCoveringCells(latLngRect)
    );

    const results = await this.dispatchQueries(covering, queryRectangleInput);
    return this.filterByRectangle(results, queryRectangleInput);
  }

  /**
   * Query a circular area constructed by a center point and its radius.
   */
  public async queryRadius(
    queryRadiusInput: QueryRadiusInput
  ): Promise<ItemList> {
    const latLngRect: S2LatLngRect =
      getBoundingLatLngRectFromQueryRadiusInput(queryRadiusInput);

    const covering = new Covering(
      new S2RegionCoverer().getCoveringCells(latLngRect)
    );

    const results = await this.dispatchQueries(covering, queryRadiusInput);
    return this.filterByRadius(results, queryRadiusInput);
  }

  /**
   * Query Amazon DynamoDB in parallel and filter the result.
   */
  protected async dispatchQueries(
    covering: Covering,
    geoQueryInput: GeoQueryInput
  ): Promise<ItemList> {
    const promises: Promise<QueryCommandOutput[]>[] = covering
      .getGeoHashRanges(this.hashKeyLength)
      .map((range) => {
        const hashKey = generateHashKey(range.rangeMin, this.hashKeyLength);
        return this.queryGeohash(
          geoQueryInput.QueryCommandInput,
          hashKey,
          range
        );
      });

    const results: QueryCommandOutput[][] = await Promise.all(promises);
    const mergedResults: ItemList = [];
    results.forEach((queryOutputs) =>
      queryOutputs.forEach((queryOutput) =>
        mergedResults.push(...(queryOutput.Items ?? []))
      )
    );
    return mergedResults;
  }

  /**
   * Filter out any points outside of the queried area from the input list.
   */
  protected filterByRadius(
    list: ItemList,
    geoQueryInput: QueryRadiusInput
  ): ItemList {
    let radiusInMeter = 0;

    const centerPoint: GeoPoint = (geoQueryInput as QueryRadiusInput)
      .CenterPoint;
    let centerLatLng: S2LatLng = S2LatLng.fromDegrees(
      centerPoint.latitude,
      centerPoint.longitude
    );
    radiusInMeter = (geoQueryInput as QueryRadiusInput).RadiusInMeter;

    return list.filter((item) => {
      const geoJson: string = item[this.geoJsonAttributeName].S ?? "";
      const coordinates = JSON.parse(geoJson).coordinates;
      const longitude = coordinates[this.longitudeFirst ? 0 : 1];
      const latitude = coordinates[this.longitudeFirst ? 1 : 0];

      const latLng: S2LatLng = S2LatLng.fromDegrees(latitude, longitude);
      return centerLatLng.getEarthDistance(latLng) <= radiusInMeter;
    });
  }

  /**
   * Filter out any points outside of the queried area from the input list.
   */
  protected filterByRectangle(
    list: ItemList,
    geoQueryInput: QueryRectangleInput
  ): ItemList {
    const latLngRect: S2LatLngRect =
      latLngRectFromQueryRectangleInput(geoQueryInput);

    return list.filter((item) => {
      const geoJson: string = item[this.geoJsonAttributeName].S ?? "";
      const coordinates = JSON.parse(geoJson).coordinates;
      const longitude = coordinates[this.longitudeFirst ? 0 : 1];
      const latitude = coordinates[this.longitudeFirst ? 1 : 0];

      const latLng: S2LatLng = S2LatLng.fromDegrees(latitude, longitude);
      return latLngRect.containsLL(latLng);
    });
  }

  /**
   * Construct a create table request object based on GeoDataManagerConfiguration. The users can update any aspect of
   * the request and call it.
   */
  public getCreateTableRequest(): CreateTableCommandInput {
    return {
      TableName: this.tableName,
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 5,
      },
      KeySchema: [
        {
          KeyType: "HASH",
          AttributeName: this.hashKeyAttributeName,
        },
        {
          KeyType: "RANGE",
          AttributeName: this.rangeKeyAttributeName,
        },
      ],
      AttributeDefinitions: [
        { AttributeName: this.hashKeyAttributeName, AttributeType: "N" },
        { AttributeName: this.rangeKeyAttributeName, AttributeType: "S" },
        { AttributeName: this.geohashAttributeName, AttributeType: "N" },
      ],
      LocalSecondaryIndexes: [
        {
          IndexName: this.geohashIndexName,
          KeySchema: [
            {
              KeyType: "HASH",
              AttributeName: this.hashKeyAttributeName,
            },
            {
              KeyType: "RANGE",
              AttributeName: this.geohashAttributeName,
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
        },
      ],
    };
  }
}

export default GeoTable;
