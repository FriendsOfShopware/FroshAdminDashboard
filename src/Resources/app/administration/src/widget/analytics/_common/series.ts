/**
 * Helpers to turn DAL aggregation buckets into chart series points.
 */

import type { SeriesPoint } from '../_base/frosh-analytics-timeseries';

interface Bucket {
    key: string;
    [nested: string]: unknown;
}

/** Parse a DAL histogram bucket key (`Y-m-d` / `Y-m-d H:00:00` / `Y-m`) to ms. */
export function parseBucketDate(key: string): number {
    // Normalise `2024-05` (month) to a parseable date.
    const normalised = getNormalisedBucketDate(key);
    const time = Date.parse(normalised.replace(' ', 'T'));
    return Number.isNaN(time) ? Date.parse(normalised) : time;
}

/** Build sorted series points from histogram buckets via a value extractor. */
export function bucketsToSeries(buckets: Bucket[], extract: (bucket: Bucket) => number): SeriesPoint[] {
    return buckets
        .map((bucket) => ({ x: parseBucketDate(bucket.key), y: extract(bucket) }))
        .sort((a, b) => a.x - b.x);
}

function getNormalisedBucketDate(key: string): string {
    // Normalise `2024-05` (month) to a parseable date
    if (/^\d{4}-\d{2}$/.test(key)) {
        return `${key}-01T00:00:00`;
    }

    // Set time to 00:00:00 for daily buckets
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        return `${key}T00:00:00`;
    }

    throw new Error(`Invalid date format: ${key}`);
}
