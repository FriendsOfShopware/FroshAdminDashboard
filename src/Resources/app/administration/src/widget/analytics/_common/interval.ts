/**
 * Date-range → histogram interval helper for the analytics widgets.
 *
 * Picks an aggregation granularity based on the span: hourly for < 1 day,
 * daily for < ~6 months, monthly beyond that. The `format` strings match the
 * DAL date-histogram PHP date format.
 */

export interface Interval {
    interval: 'hour' | 'day' | 'month';
    format: string;
}

export const HOUR_INTERVAL: Interval = { interval: 'hour', format: 'Y-m-d H:00:00' };
export const DAY_INTERVAL: Interval = { interval: 'day', format: 'Y-m-d' };
export const MONTH_INTERVAL: Interval = { interval: 'month', format: 'Y-m' };

const DAY_MS = 24 * 60 * 60 * 1000;

export function intervalFromDates(fromDate: Date, toDate: Date): Interval {
    const diffDays = (toDate.getTime() - fromDate.getTime()) / DAY_MS;

    if (diffDays < 1) {
        return HOUR_INTERVAL;
    }

    if (diffDays < 183) {
        return DAY_INTERVAL;
    }

    return MONTH_INTERVAL;
}

/** The histogram bucket field — orders/customers use a datetime for hourly. */
export function histogramField(interval: Interval, dateTimeField: string, dateField: string): string {
    return interval.interval === 'hour' ? dateTimeField : dateField;
}
