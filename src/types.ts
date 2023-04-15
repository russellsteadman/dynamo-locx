import {
  type AttributeValue,
  type BatchWriteItemCommandOutput,
  type DeleteItemCommandOutput,
  type QueryCommandOutput,
  type GetItemCommandOutput,
  type PutItemCommandOutput,
  type QueryCommandInput,
  type UpdateItemCommandInput,
  type UpdateItemCommandOutput,
  type PutItemCommandInput,
  type GetItemCommandInput,
  type DeleteItemCommandInput,
  type DynamoDBClient,
} from '@aws-sdk/client-dynamodb';

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
  geoJsonPointType?: 'Point' | 'POINT';
};

export type ItemList = Array<Record<string, AttributeValue>>;

export type BatchWritePointOutput = BatchWriteItemCommandOutput;

export type DeletePointInput = {
  RangeKeyValue: AttributeValue;
  GeoPoint: GeoPoint;
  DeleteItemCommandInput?: Omit<DeleteItemCommandInput, 'TableName'>;
};
export type DeletePointOutput = DeleteItemCommandOutput;

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type GeoQueryInput = {
  QueryCommandInput?: Omit<QueryCommandInput, 'TableName'>;
};
export type GeoQueryOutput = QueryCommandOutput;

export type GetPointInput = {
  RangeKeyValue: AttributeValue;
  GeoPoint: GeoPoint;
  GetItemCommandInput: Omit<GetItemCommandInput, 'TableName'>;
};
export type GetPointOutput = GetItemCommandOutput;

export type PutPointInput = {
  RangeKeyValue: AttributeValue;
  GeoPoint: GeoPoint;
  PutItemCommandInput: Omit<PutItemCommandInput, 'TableName'>;
};
export type PutPointOutput = PutItemCommandOutput;

export type QueryRadiusInput = {
  RadiusInMeter: number;
  CenterPoint: GeoPoint;
} & GeoQueryInput;
export type QueryRadiusOutput = GeoQueryOutput;

export type QueryRectangleInput = {
  MinPoint: GeoPoint;
  MaxPoint: GeoPoint;
} & GeoQueryInput;
export type QueryRectangleOutput = GeoQueryOutput;

export type UpdatePointInput = {
  RangeKeyValue: AttributeValue;
  GeoPoint: GeoPoint;
  UpdateItemCommandInput: Omit<
    Omit<UpdateItemCommandInput, 'TableName'>,
    'Key'
  >;
};
export type UpdatePointOutput = UpdateItemCommandOutput;
