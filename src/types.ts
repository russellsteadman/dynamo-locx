import {
  AttributeValue,
  BatchWriteItemCommandOutput,
  DeleteItemCommandOutput,
  QueryCommandOutput,
  GetItemCommandOutput,
  PutItemCommandOutput,
  QueryCommandInput,
  UpdateItemCommandInput,
  UpdateItemCommandOutput,
  PutItemCommandInput,
  GetItemCommandInput,
  DeleteItemCommandInput,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

export type GeoTableConfiguration = {
  client: DynamoDBClient;
  tableName: string;

  consistentRead?: boolean;
  hashKeyAttributeName?: string;
  rangeKeyAttributeName?: string;
  geohashAttributeName?: string;
  geoJsonAttributeName?: string;
  geohashIndexName?: string;
  hashKeyLength?: number;
  longitudeFirst?: boolean;
  geoJsonPointType?: "Point" | "POINT";
};

export type ItemList = Record<string, AttributeValue>[];

export interface BatchWritePointOutput extends BatchWriteItemCommandOutput {}

export interface DeletePointInput {
  RangeKeyValue: AttributeValue;
  GeoPoint: GeoPoint;
  DeleteItemCommandInput?: Omit<DeleteItemCommandInput, "TableName">;
}
export interface DeletePointOutput extends DeleteItemCommandOutput {}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoQueryInput {
  QueryCommandInput?: Omit<QueryCommandInput, "TableName">;
}
export interface GeoQueryOutput extends QueryCommandOutput {}

export interface GetPointInput {
  RangeKeyValue: AttributeValue;
  GeoPoint: GeoPoint;
  GetItemCommandInput: Omit<GetItemCommandInput, "TableName">;
}
export interface GetPointOutput extends GetItemCommandOutput {}

export interface PutPointInput {
  RangeKeyValue: AttributeValue;
  GeoPoint: GeoPoint;
  PutItemCommandInput: Omit<PutItemCommandInput, "TableName">;
}
export interface PutPointOutput extends PutItemCommandOutput {}

export interface QueryRadiusInput extends GeoQueryInput {
  RadiusInMeter: number;
  CenterPoint: GeoPoint;
}
export interface QueryRadiusOutput extends GeoQueryOutput {}

export interface QueryRectangleInput extends GeoQueryInput {
  MinPoint: GeoPoint;
  MaxPoint: GeoPoint;
}
export interface QueryRectangleOutput extends GeoQueryOutput {}

export interface UpdatePointInput {
  RangeKeyValue: AttributeValue;
  GeoPoint: GeoPoint;
  UpdateItemCommandInput: Omit<
    Omit<UpdateItemCommandInput, "TableName">,
    "Key"
  >;
}
export interface UpdatePointOutput extends UpdateItemCommandOutput {}
