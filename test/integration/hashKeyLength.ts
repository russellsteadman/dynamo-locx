import ava from "ava";
import { S2RegionCoverer } from "nodes2ts";
import { S2Util } from "../../src/s2/S2Util";
import { Covering } from "../../src/model/Covering";

ava("Appropriate hash key lengths, 10m radius", (t) => {
  const cov = new Covering(
    new S2RegionCoverer().getCoveringCells(
      S2Util.getBoundingLatLngRectFromQueryRadiusInput({
        RadiusInMeter: 10,
        CenterPoint: {
          latitude: 59,
          longitude: 0,
        },
      })
    )
  );

  t.is(cov.getNumberOfCells(), 8);
  t.is(cov.getGeoHashRanges(10).length, 8);
  t.is(cov.getGeoHashRanges(11).length, 8); // Recommend hashKeyLength = 11 for 10m radius searches
  t.is(cov.getGeoHashRanges(12).length, 11);
  t.is(cov.getGeoHashRanges(13).length, 32);
  t.is(cov.getGeoHashRanges(13).length, 32);
});

ava("Appropriate hash key lengths, 1km radius", (t) => {
  const cov = new Covering(
    new S2RegionCoverer().getCoveringCells(
      S2Util.getBoundingLatLngRectFromQueryRadiusInput({
        RadiusInMeter: 1000,
        CenterPoint: {
          latitude: 59,
          longitude: 0,
        },
      })
    )
  );

  t.is(cov.getNumberOfCells(), 8);
  t.is(cov.getGeoHashRanges(6).length, 8);
  t.is(cov.getGeoHashRanges(7).length, 8); // Recommend hashKeyLength = 7 for 1km radius searches
  t.is(cov.getGeoHashRanges(8).length, 10);
  t.is(cov.getGeoHashRanges(9).length, 36);
  t.is(cov.getGeoHashRanges(9).length, 36);
});

ava("Appropriate hash key lengths, 10km radius", (t) => {
  const cov = new Covering(
    new S2RegionCoverer().getCoveringCells(
      S2Util.getBoundingLatLngRectFromQueryRadiusInput({
        RadiusInMeter: 10000,
        CenterPoint: {
          latitude: 59,
          longitude: 0,
        },
      })
    )
  );

  t.is(cov.getNumberOfCells(), 8);
  t.is(cov.getGeoHashRanges(2).length, 8);
  t.is(cov.getGeoHashRanges(3).length, 8);
  t.is(cov.getGeoHashRanges(4).length, 8);
  t.is(cov.getGeoHashRanges(5).length, 8); // Recommend hashKeyLength = 5 for 10km radius searches
  t.is(cov.getGeoHashRanges(6).length, 9);
  t.is(cov.getGeoHashRanges(7).length, 29);
  t.is(cov.getGeoHashRanges(8).length, 216);
});

ava("Appropriate hash key lengths, 50km radius", (t) => {
  const cov = new Covering(
    new S2RegionCoverer().getCoveringCells(
      S2Util.getBoundingLatLngRectFromQueryRadiusInput({
        RadiusInMeter: 50000,
        CenterPoint: {
          latitude: 59,
          longitude: 0,
        },
      })
    )
  );

  t.is(cov.getNumberOfCells(), 6);
  t.is(cov.getGeoHashRanges(2).length, 6);
  t.is(cov.getGeoHashRanges(3).length, 6);
  t.is(cov.getGeoHashRanges(4).length, 6); // Recommend hashKeyLength = 4 for 50km radius searches
  t.is(cov.getGeoHashRanges(5).length, 9);
  t.is(cov.getGeoHashRanges(6).length, 49);
  t.is(cov.getGeoHashRanges(7).length, 428);
});

ava("Appropriate hash key lengths, 100km radius", (t) => {
  const cov = new Covering(
    new S2RegionCoverer().getCoveringCells(
      S2Util.getBoundingLatLngRectFromQueryRadiusInput({
        RadiusInMeter: 100000,
        CenterPoint: {
          latitude: 59,
          longitude: 0,
        },
      })
    )
  );

  t.is(cov.getNumberOfCells(), 8);
  t.is(cov.getGeoHashRanges(2).length, 8);
  t.is(cov.getGeoHashRanges(3).length, 8); // Recommend hashKeyLength = 3 for 100km radius searches
  t.is(cov.getGeoHashRanges(4).length, 11);
  t.is(cov.getGeoHashRanges(5).length, 36);
  t.is(cov.getGeoHashRanges(6).length, 292);
});

ava("Appropriate hash key lengths, 1000km radius", (t) => {
  const cov = new Covering(
    new S2RegionCoverer().getCoveringCells(
      S2Util.getBoundingLatLngRectFromQueryRadiusInput({
        RadiusInMeter: 1000000,
        CenterPoint: {
          latitude: 59,
          longitude: 0,
        },
      })
    )
  );

  t.is(cov.getNumberOfCells(), 8);
  t.is(cov.getGeoHashRanges(1).length, 8); // Recommend hashKeyLength = 1 for 1000km radius searches
  t.is(cov.getGeoHashRanges(2).length, 10);
  t.is(cov.getGeoHashRanges(3).length, 35);
  t.is(cov.getGeoHashRanges(4).length, 289);
});
