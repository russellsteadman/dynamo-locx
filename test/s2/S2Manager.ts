import { S2Manager } from "../../src/s2/S2Manager";
import Long from "long";
import ava from "ava";

ava("generateGeoHash", (t) => {
  t.is(
    S2Manager.generateGeohash({
      latitude: 52.1,
      longitude: 2,
    }).toString(10),
    "5177531549489041509"
  );
});

ava("generateHashKey", (t) => {
  t.is(
    S2Manager.generateHashKey(
      Long.fromString("5177531549489041509", false, 10),
      6
    ).toNumber(),
    517753
  );
});
