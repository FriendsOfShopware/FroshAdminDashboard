import './frosh-analytics-timeseries.scss';
import template from './frosh-analytics-timeseries.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../../_common/interval';
import { intervalFromDates } from '../../_common/interval';

export interface SeriesPoint {
    x: number;
    y: number;
}

export interface TimeseriesResult {
    series: SeriesPoint[];
    summary: number;
}

/** A fetcher resolves the chart data for a date range / sales channel. */
export type TimeseriesFetcher = (
    fromDate: Date,
    toDate: Date,
    interval: Interval,
    salesChannelId: string | null,
) => Promise<TimeseriesResult>;

interface RangeOption {
    label: string;
    days: number;
}

const RANGES: RangeOption[] = [
    { label: '30Days', days: 30 },
    { label: '14Days', days: 14 },
    { label: '7Days', days: 7 },
    { label: 'yesterday', days: 1 },
];

/**
 * Reusable base for the analytics time-series widgets. Renders the core
 * `sw-chart-card` with its built-in range picker and delegates data loading to
 * the `fetcher` prop, so each concrete widget only supplies its criteria logic.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['acl'],

    props: {
        fetcher: {
            type: Function as PropType<TimeseriesFetcher>,
            required: true,
        },
        seriesName: {
            type: String,
            required: true,
        },
        chartType: {
            type: String,
            required: false,
            default: 'line',
        },
        // 'money' formats the summary/tooltip as currency, 'number' as plain.
        valueFormat: {
            type: String,
            required: false,
            default: 'number',
        },
        settings: {
            type: Object as PropType<{ salesChannelId?: string | null }>,
            required: false,
            default: () => ({}),
        },
    },

    data(): {
        series: SeriesPoint[];
        summary: number;
        isLoading: boolean;
        selectedRange: string;
        currentRangeDates: { fromDate: Date; toDate: Date; interval: Interval } | null;
        } {
        return {
            series: [],
            summary: 0,
            isLoading: true,
            selectedRange: '30Days',
            currentRangeDates: null,
        };
    },

    computed: {
        availableRanges(): string[] {
            return RANGES.map((range) => range.label);
        },

        salesChannelId(): string | null {
            return this.settings.salesChannelId ?? null;
        },

        chartSeries(): Array<{ name: string; data: SeriesPoint[] }> {
            return [{ name: this.seriesName, data: this.series }];
        },

        currencyFilter() {
            return Shopware.Filter.getByName('currency');
        },

        systemCurrencyISOCode(): string {
            return Shopware.Context.app.systemCurrencyISOCode ?? 'EUR';
        },

        formattedSummary(): string {
            if (this.valueFormat === 'money') {
                return this.currencyFilter(this.summary, this.systemCurrencyISOCode, 2);
            }
            return new Intl.NumberFormat().format(Math.round(this.summary * 100) / 100);
        },

        fillEmptyValues(): 'hour' | 'day' {
            return this.currentRangeDates?.interval.interval === 'hour' ? 'hour' : 'day';
        },

        chartOptions(): Record<string, unknown> {
            return {
                xaxis: {
                    type: 'datetime',
                    min: this.currentRangeDates?.fromDate.getTime(),
                    labels: {
                        datetimeUTC: false,
                    },
                },
                yaxis: {
                    min: 0,
                    labels: {
                        formatter: (value: number) =>
                            this.valueFormat === 'money'
                                ? this.currencyFilter(value, this.systemCurrencyISOCode, 0)
                                : new Intl.NumberFormat().format(Math.round(value)),
                    },
                },
            };
        },
    },

    created() {
        void this.load();
    },

    mounted() {
        this.labelRangeSelect();
    },

    methods: {
        /**
         * The core sw-chart-card renders an unlabelled <select> for the range
         * picker (and only after it stops loading). We don't own that markup, so
         * poll briefly and add an aria-label for a11y (axe: select-name).
         */
        labelRangeSelect(attempt = 0): void {
            const select = this.$el?.querySelector?.('select');
            if (select) {
                if (!select.getAttribute('aria-label')) {
                    select.setAttribute('aria-label', this.$tc('frosh-admin-dashboard.analytics.rangeLabel'));
                }
                return;
            }
            if (attempt < 20) {
                window.setTimeout(() => this.labelRangeSelect(attempt + 1), 150);
            }
        },

        rangeDates(rangeLabel: string): { fromDate: Date; toDate: Date; interval: Interval } {
            const range = RANGES.find((entry) => entry.label === rangeLabel) ?? RANGES[0];

            // Use the true current instant so the `lte` bound includes records
            // created in the last few hours. (`dateWithUserTimezone()` shifts the
            // instant by the user offset and would undercount recent data.)
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - range.days);

            return { fromDate, toDate, interval: intervalFromDates(fromDate, toDate) };
        },

        async load(): Promise<void> {
            if (!this.acl.can('order.viewer') && !this.acl.can('customer.viewer')) {
                this.isLoading = false;
                return;
            }

            this.isLoading = true;
            const { fromDate, toDate, interval } = this.rangeDates(this.selectedRange);
            this.currentRangeDates = { fromDate, toDate, interval };

            try {
                const result = await this.fetcher(fromDate, toDate, interval, this.salesChannelId);
                this.series = result.series;
                this.summary = result.summary;
            } catch {
                this.series = [];
                this.summary = 0;
            } finally {
                this.isLoading = false;
                // The range <select> only renders once loading stops.
                this.$nextTick(() => this.labelRangeSelect());
            }
        },

        onRangeUpdate(range: string): void {
            this.selectedRange = range;
            void this.load();
        },
    },

    watch: {
        salesChannelId(): void {
            void this.load();
        },
    },
});
