import { GeohashRange } from "../../src/model/GeohashRange";
import Long from "long";
import ava from "ava";

const range = new GeohashRange(
  Long.fromString("1000000000000000000"),
  Long.fromString("1000000000010000000")
);

ava("returns the same range when nothing needs splitting", (t) => {
  t.deepEqual(range.trySplit(1), [range]);
  t.deepEqual(range.trySplit(3), [range]);
  t.deepEqual(range.trySplit(4), [range]);
  t.deepEqual(range.trySplit(5), [range]);
  t.deepEqual(range.trySplit(6), [range]);
  t.deepEqual(range.trySplit(7), [range]);
  t.deepEqual(range.trySplit(8), [range]);
  t.deepEqual(range.trySplit(9), [range]);
  t.deepEqual(range.trySplit(10), [range]);
  t.deepEqual(range.trySplit(11), [range]);
});

ava("splits correctly on the given digit", (t) => {
  t.deepEqual(range.trySplit(12), [
    new GeohashRange(
      Long.fromString("1000000000000000000"),
      Long.fromString("1000000000009999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000010000000"),
      Long.fromString("1000000000010000000")
    ),
  ]);

  t.deepEqual(range.trySplit(13), [
    new GeohashRange(
      Long.fromString("1000000000000000000"),
      Long.fromString("1000000000000999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000001000000"),
      Long.fromString("1000000000001999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000002000000"),
      Long.fromString("1000000000002999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000003000000"),
      Long.fromString("1000000000003999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000004000000"),
      Long.fromString("1000000000004999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000005000000"),
      Long.fromString("1000000000005999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000006000000"),
      Long.fromString("1000000000006999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000007000000"),
      Long.fromString("1000000000007999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000008000000"),
      Long.fromString("1000000000008999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000009000000"),
      Long.fromString("1000000000009999999")
    ),
    new GeohashRange(
      Long.fromString("1000000000010000000"),
      Long.fromString("1000000000010000000")
    ),
  ]);
});
