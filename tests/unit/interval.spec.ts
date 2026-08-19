import {
    DAY_INTERVAL,
    HOUR_INTERVAL,
    MONTH_INTERVAL,
    histogramField,
    intervalFromDates,
} from '../../src/Resources/app/administration/src/widget/analytics/_common/interval';

describe('intervalFromDates', () => {
    const from = new Date('2026-08-01T00:00:00.000Z');

    it('uses hours for a span under one day', () => {
        expect(intervalFromDates(from, new Date('2026-08-01T12:00:00.000Z'))).toEqual(HOUR_INTERVAL);
    });

    it('uses days for a span under six months', () => {
        expect(intervalFromDates(from, new Date('2026-08-31T00:00:00.000Z'))).toEqual(DAY_INTERVAL);
    });

    it('uses months for a span of six months or more', () => {
        expect(intervalFromDates(from, new Date('2027-02-01T00:00:00.000Z'))).toEqual(MONTH_INTERVAL);
    });
});

describe('histogramField', () => {
    it('uses the datetime field for hourly buckets', () => {
        expect(histogramField(HOUR_INTERVAL, 'orderDateTime', 'orderDate')).toBe('orderDateTime');
    });

    it('uses the date field for daily and monthly buckets', () => {
        expect(histogramField(DAY_INTERVAL, 'orderDateTime', 'orderDate')).toBe('orderDate');
        expect(histogramField(MONTH_INTERVAL, 'orderDateTime', 'orderDate')).toBe('orderDate');
    });
});
