import './frosh-widget-gmv.scss';
import template from './frosh-widget-gmv.html.twig';
import type { PropType } from 'vue';
import { DAY_INTERVAL, MONTH_INTERVAL } from '../_common/interval';
import type { Interval } from '../_common/interval';
import {
    baseOrderCriteria,
    dateRangeFilter,
    excludeSaasTestOrders,
    groupedByCurrencyFactorHistogram,
    parseCurrencyFactor,
    normaliseAmount,
    roundMoney,
} from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

const DEFAULT_YEAR_COUNT = 3;
const MIN_YEAR_COUNT = 1;
const MAX_YEAR_COUNT = 20;
const DEFAULT_START_MONTH = 1;
const DEFAULT_START_DAY = 1;
const ROLLING_MONTHS = [6, 12, 18] as const;

interface CurrencyBucket {
    key: string | number;
    orderDate?: { buckets: Array<{ key: string; sumAmount?: { sum: number } }> };
}

interface GmvRow {
    id: string;
    label: string;
    value: number;
    formattedValue: string;
    group: 'year' | 'rolling';
}

/** One displayed billing year: `[start, end)` plus the year it is named after. */
interface Period {
    startYear: number;
    start: Date;
    end: Date;
}

interface GmvSettings {
    salesChannelId?: string | null;
    yearCount?: number | string | null;
    billingYearStartMonth?: number | string | null;
    billingYearStartDay?: number | string | null;
}

/** Clamp a setting to an integer range, falling back for empty / non-numeric values. */
function intSetting(raw: unknown, fallback: number, min: number, max: number): number {
    const value = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);

    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(Math.max(Math.trunc(value), min), max);
}

function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** UTC noon so day arithmetic stays DST- and timezone-safe. Short months clamp the day. */
function atNoonUtc(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, Math.min(day, daysInMonth(year, month)), 12, 0, 0));
}

/**
 * GMV table matching Shopware Commercial's TurnoverCollector: sum of live
 * `order.amount_total` (gross), currency-normalised, excluding SaaS test orders.
 * Shows the last `yearCount` billing years — starting on the configured
 * month/day, so non-calendar billing years work — plus rolling 6 / 12 / 18 month
 * totals.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory', 'acl'],

    props: {
        settings: {
            type: Object as PropType<GmvSettings>,
            required: false,
            default: () => ({}),
        },
    },

    data(): { rows: GmvRow[]; isLoading: boolean } {
        return {
            rows: [],
            isLoading: true,
        };
    },

    computed: {
        yearRows(): GmvRow[] {
            return this.rows.filter((row) => row.group === 'year');
        },

        rollingRows(): GmvRow[] {
            return this.rows.filter((row) => row.group === 'rolling');
        },

        salesChannelId(): string | null {
            return this.settings.salesChannelId ?? null;
        },

        /** How many billing years the table lists. */
        yearCount(): number {
            return intSetting(this.settings.yearCount, DEFAULT_YEAR_COUNT, MIN_YEAR_COUNT, MAX_YEAR_COUNT);
        },

        startMonth(): number {
            return intSetting(this.settings.billingYearStartMonth, DEFAULT_START_MONTH, 1, 12);
        },

        startDay(): number {
            return intSetting(this.settings.billingYearStartDay, DEFAULT_START_DAY, 1, 31);
        },

        /** A year starting on 1 January is a plain calendar year and is labelled as one. */
        isCalendarYear(): boolean {
            return this.startMonth === 1 && this.startDay === 1;
        },

        /**
         * Billing years, newest first. The current one is whichever contains
         * today, so a billing year that already started this year wins over the
         * one that ended earlier in it.
         */
        periods(): Period[] {
            const today = new Date();
            const thisYearsStart = atNoonUtc(today.getFullYear(), this.startMonth, this.startDay);
            const currentStartYear =
                today.getTime() >= thisYearsStart.getTime() ? today.getFullYear() : today.getFullYear() - 1;

            return Array.from({ length: this.yearCount }, (_, index) => {
                const startYear = currentStartYear - index;

                return {
                    startYear,
                    start: atNoonUtc(startYear, this.startMonth, this.startDay),
                    end: atNoonUtc(startYear + 1, this.startMonth, this.startDay),
                };
            });
        },

        /**
         * Month buckets are only exact when every year boundary falls on the
         * first of a month; otherwise the histogram has to be daily.
         */
        interval(): Interval {
            return this.startDay === 1 ? MONTH_INTERVAL : DAY_INTERVAL;
        },

        currencyFilter() {
            return Shopware.Filter.getByName('currency');
        },

        systemCurrencyISOCode(): string {
            return Shopware.Context.app.systemCurrencyISOCode ?? 'EUR';
        },
    },

    created() {
        void this.load();
    },

    watch: {
        salesChannelId(): void {
            void this.load();
        },

        yearCount(): void {
            void this.load();
        },

        startMonth(): void {
            void this.load();
        },

        startDay(): void {
            void this.load();
        },
    },

    methods: {
        formatMoney(value: number): string {
            return this.currencyFilter(value, this.systemCurrencyISOCode, 2);
        },

        /**
         * Oldest instant we need to fetch: the start of the oldest business
         * year, or the start of the longest rolling window when that reaches
         * further back (e.g. a single-year table still needs 18 months).
         */
        rangeStart(): Date {
            const oldestPeriodStart = this.periods[this.periods.length - 1].start;
            const today = new Date();
            const rollingStart = atNoonUtc(
                today.getFullYear(),
                today.getMonth() + 1,
                1,
            );
            rollingStart.setUTCMonth(rollingStart.getUTCMonth() - (Math.max(...ROLLING_MONTHS) - 1));

            return rollingStart.getTime() < oldestPeriodStart.getTime() ? rollingStart : oldestPeriodStart;
        },

        /** `2025` for calendar years, `2025/26` for billing years spanning two. */
        periodLabel(period: Period): string {
            if (this.isCalendarYear) {
                return String(period.startYear);
            }

            return `${period.startYear}/${String((period.startYear + 1) % 100).padStart(2, '0')}`;
        },

        /** `YYYY-MM` keys for the last `count` months, newest first. */
        rollingMonthKeys(count: number): string[] {
            const keys: string[] = [];
            const cursor = new Date();
            cursor.setDate(1);

            for (let index = 0; index < count; index += 1) {
                const year = cursor.getFullYear();
                const month = String(cursor.getMonth() + 1).padStart(2, '0');
                keys.push(`${year}-${month}`);
                cursor.setMonth(cursor.getMonth() - 1);
            }

            return keys;
        },

        /** Histogram key (`Y-m` or `Y-m-d`) → the bucket's first instant, at UTC noon. */
        bucketDate(key: string): Date | null {
            const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(key);

            if (!match) {
                return null;
            }

            return atNoonUtc(Number(match[1]), Number(match[2]), Number(match[3] ?? 1));
        },

        buildRows(amountByPeriod: number[], amountByMonth: Record<string, number>): GmvRow[] {
            const rows: GmvRow[] = this.periods.map((period, index) => {
                const value = roundMoney(amountByPeriod[index] ?? 0);

                return {
                    id: `year-${period.startYear}`,
                    label: this.periodLabel(period),
                    value,
                    formattedValue: this.formatMoney(value),
                    group: 'year',
                };
            });

            ROLLING_MONTHS.forEach((months) => {
                const value = roundMoney(
                    this.rollingMonthKeys(months).reduce((sum, key) => sum + (amountByMonth[key] ?? 0), 0),
                );

                rows.push({
                    id: `rolling-${months}`,
                    label: this.$tc(`frosh-admin-dashboard.widget.gmv.rolling${months}`),
                    value,
                    formattedValue: this.formatMoney(value),
                    group: 'rolling',
                });
            });

            return rows;
        },

        async load(): Promise<void> {
            if (!this.acl.can('order.viewer')) {
                this.isLoading = false;
                return;
            }

            this.isLoading = true;

            try {
                const periods = this.periods;
                const fromDate = this.rangeStart();
                const toDate = new Date();
                const criteria = excludeSaasTestOrders(baseOrderCriteria(this.salesChannelId));
                criteria
                    .addFilter(dateRangeFilter(fromDate, toDate))
                    .addAggregation(
                        groupedByCurrencyFactorHistogram(
                            this.interval,
                            Criteria.sum('sumAmount', 'amountTotal'),
                            'groupedByCurrencyFactor',
                        ),
                    );

                const result = await this.repositoryFactory.create('order').search(criteria, Shopware.Context.api);
                const amountByPeriod: number[] = periods.map(() => 0);
                const amountByMonth: Record<string, number> = {};

                ((result?.aggregations?.groupedByCurrencyFactor?.buckets ?? []) as CurrencyBucket[]).forEach(
                    (currencyBucket) => {
                        const factor = parseCurrencyFactor(currencyBucket.key);
                        if (!factor) {
                            return;
                        }

                        (currencyBucket.orderDate?.buckets ?? []).forEach((dateBucket) => {
                            const amount = normaliseAmount(dateBucket.sumAmount?.sum ?? 0, factor);
                            const monthKey = dateBucket.key.slice(0, 7);
                            amountByMonth[monthKey] = roundMoney((amountByMonth[monthKey] ?? 0) + amount);

                            const date = this.bucketDate(dateBucket.key);
                            if (!date) {
                                return;
                            }

                            const periodIndex = periods.findIndex(
                                (period) =>
                                    date.getTime() >= period.start.getTime() && date.getTime() < period.end.getTime(),
                            );

                            if (periodIndex !== -1) {
                                amountByPeriod[periodIndex] = roundMoney(amountByPeriod[periodIndex] + amount);
                            }
                        });
                    },
                );

                this.rows = this.buildRows(amountByPeriod, amountByMonth);
            } catch {
                this.rows = [];
            } finally {
                this.isLoading = false;
            }
        },
    },
});
