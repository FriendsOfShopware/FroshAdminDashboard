/**
 * Order-aggregation criteria helpers for the analytics widgets. The native
 * admin `Criteria` exposes the full DAL aggregation API (histogram / terms /
 * sum / count), which these helpers compose.
 */

import type { Interval } from './interval';
import { histogramField } from './interval';

const { Criteria } = Shopware.Data;

type Aggregation = ReturnType<typeof Criteria.sum>;

/** The admin user's IANA timezone (defaults to UTC) — used to bucket histograms by local days. */
export function userTimeZone(): string {
    return (Shopware.Store.get('session').currentUser?.timeZone as string) ?? 'UTC';
}

/**
 * Format a real instant as the UTC datetime string the DAL range filter expects
 * (`Y-m-d H:i:s`). The input `Date` must encode the true instant (e.g. a plain
 * `new Date()`); never a value from `dateWithUserTimezone()`, which shifts the
 * instant by the user's offset and would undercount the most recent records.
 */
export function toStorageDateTime(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** Date-only (`Y-m-d`) bound for date-only DAL fields. */
export function toStorageDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function baseOrderCriteria(salesChannelId?: string | null): InstanceType<typeof Criteria> {
    const criteria = new Criteria(1, 1);
    criteria.setTotalCountMode(0);

    if (salesChannelId) {
        criteria.addFilter(Criteria.equals('salesChannelId', salesChannelId));
    }

    return criteria;
}

export function dateRangeFilter(fromDate: Date, toDate: Date): ReturnType<typeof Criteria.range> {
    return Criteria.range('orderDate', {
        gte: toStorageDateOnly(fromDate),
        lte: toStorageDateOnly(toDate),
    });
}

/** Histogram over the order date, with a nested aggregation. Bucketed by the user's timezone. */
export function groupedByDateHistogram(interval: Interval, nested: Aggregation): ReturnType<typeof Criteria.histogram> {
    return Criteria.histogram(
        'groupedByDate',
        histogramField(interval, 'orderDateTime', 'orderDate'),
        interval.interval,
        interval.format,
        nested,
        userTimeZone(),
    );
}

/** Terms(currencyFactor) -> histogram(date) -> nested, used to normalise multi-currency sums. */
export function groupedByCurrencyFactorHistogram(
    interval: Interval,
    nested: Aggregation,
    bucketName: string,
): ReturnType<typeof Criteria.terms> {
    return Criteria.terms(
        bucketName,
        'currencyFactor',
        null,
        null,
        Criteria.histogram(
            'orderDate',
            histogramField(interval, 'orderDateTime', 'orderDate'),
            interval.interval,
            interval.format,
            nested,
            userTimeZone(),
        ),
    );
}

export function parseCurrencyFactor(value: string | number): number | null {
    const factor = Number(value);

    return Number.isFinite(factor) && factor > 0 ? factor : null;
}
