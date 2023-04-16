import type Long from 'long';
import type { S2CellId } from 'nodes2ts';
import { GeohashRange } from './geohash-range.js';

export class Covering {
  constructor(private readonly cellIds: S2CellId[]) {
    this.cellIds = cellIds;
  }

  public getGeoHashRanges(hashKeyLength: number) {
    const ranges: GeohashRange[] = [];
    for (const outerRange of this.cellIds) {
      const hashRange = new GeohashRange(
        outerRange.rangeMin().id,
        outerRange.rangeMax().id,
      );
      ranges.push(...hashRange.trySplit(hashKeyLength));
    }

    return ranges;
  }

  public getNumberOfCells() {
    return this.cellIds.length;
  }
}
