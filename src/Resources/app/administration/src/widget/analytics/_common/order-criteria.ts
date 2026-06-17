/**
 * Order-aggregation criteria helpers for the analytics widgets. The native
 * admin `Criteria` exposes the full DAL aggregation API (histogram / terms /
 * sum / count), which these helpers compose.
 */

import type { Interval } from './interval';
import { histogramField } from './interval';

const { Criteria } = Shopware.Data;
const { format } = Shopware.Utils;

type Aggregation = ReturnType<typeof Criteria.sum>;

/** Storage date format the DAL range filter expects (UTC, `Y-m-d H:i:s`). */
function toStorageDate(date: Date): string {
    return format.dateWithUserTimezone
        ? new Date(date).toISOString().slice(0, 19).replace('T', ' ')
        : new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

/** Date-only fields must receive date-only values or the first day can be excluded. */
export function toStorageDateOnly(date: Date): string {
    return format.toISODate(date, false);
}

export function toStorageDateTime(date: Date): string {
    return toStorageDate(date);
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

/** Histogram over the order date, with a nested aggregation. */
export function groupedByDateHistogram(interval: Interval, nested: Aggregation): ReturnType<typeof Criteria.histogram> {
    return Criteria.histogram(
        'groupedByDate',
        histogramField(interval, 'orderDateTime', 'orderDate'),
        interval.interval,
        interval.format,
        nested,
        null,
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
            null,
        ),
    );
}

export function parseCurrencyFactor(value: string | number): number | null {
    const factor = Number(value);

    return Number.isFinite(factor) && factor > 0 ? factor : null;
}
