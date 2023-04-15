import { S2LatLng, S2LatLngRect } from 'nodes2ts';
import { type QueryRadiusInput, type QueryRectangleInput } from '../types.js';

export const latLngRectFromQueryRectangleInput = (
  geoQueryRequest: QueryRectangleInput,
): S2LatLngRect => {
  const queryRectangleRequest = geoQueryRequest;

  const minPoint = queryRectangleRequest.MinPoint;
  const maxPoint = queryRectangleRequest.MaxPoint;

  if (minPoint && maxPoint) {
    const minLatLng = S2LatLng.fromDegrees(
      minPoint.latitude,
      minPoint.longitude,
    );
    const maxLatLng = S2LatLng.fromDegrees(
      maxPoint.latitude,
      maxPoint.longitude,
    );

    return S2LatLngRect.fromLatLng(minLatLng, maxLatLng);
  }

  throw new Error('Invalid query rectangle input.');
};

export const getBoundingLatLngRectFromQueryRadiusInput = (
  geoQueryRequest: QueryRadiusInput,
): S2LatLngRect => {
  const centerPoint = geoQueryRequest.CenterPoint;
  const radiusInMeter = geoQueryRequest.RadiusInMeter;

  const centerLatLng = S2LatLng.fromDegrees(
    centerPoint.latitude,
    centerPoint.longitude,
  );

  const latReferenceUnit = centerPoint.latitude > 0 ? -1 : 1;
  const latReferenceLatLng = S2LatLng.fromDegrees(
    centerPoint.latitude + latReferenceUnit,
    centerPoint.longitude,
  );
  const lngReferenceUnit = centerPoint.longitude > 0 ? -1 : 1;
  const lngReferenceLatLng = S2LatLng.fromDegrees(
    centerPoint.latitude,
    centerPoint.longitude + lngReferenceUnit,
  );

  const latForRadius =
    radiusInMeter / centerLatLng.getEarthDistance(latReferenceLatLng);
  const lngForRadius =
    radiusInMeter / centerLatLng.getEarthDistance(lngReferenceLatLng);

  const minLatLng = S2LatLng.fromDegrees(
    centerPoint.latitude - latForRadius,
    centerPoint.longitude - lngForRadius,
  );
  const maxLatLng = S2LatLng.fromDegrees(
    centerPoint.latitude + latForRadius,
    centerPoint.longitude + lngForRadius,
  );

  return S2LatLngRect.fromLatLng(minLatLng, maxLatLng);
};
