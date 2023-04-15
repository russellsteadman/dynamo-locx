import Long from 'long';
import test from 'ava';
import { generateGeohash, generateHashKey } from '../../s2/s2-manager.js';

test('generateGeoHash', (t) => {
  t.is(
    generateGeohash({
      latitude: 52.1,
      longitude: 2,
    }).toString(10),
    '5177531549489041509',
  );
});

test('generateHashKey', (t) => {
  t.is(
    generateHashKey(
      Long.fromString('5177531549489041509', false, 10),
      6,
    ).toNumber(),
    517_753,
  );
});
