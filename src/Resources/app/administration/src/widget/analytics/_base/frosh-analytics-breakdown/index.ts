import './frosh-analytics-breakdown.scss';
import template from './frosh-analytics-breakdown.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../../_common/interval';
import { intervalFromDates } from '../../_common/interval';

export interface BreakdownRow {
    id: string;
    name: string;
    /** Raw numeric value used for the proportion bar. */
    value: number;
    /** Display string (already formatted as money / count / percentage). */
    formattedValue: string;
}

export type BreakdownFetcher = (
    fromDate: Date,
    toDate: Date,
    interval: Interval,
    salesChannelId: string | null,
) => Promise<BreakdownRow[]>;

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
 * Reusable base for the analytics "top-N / breakdown" widgets. Renders a ranked
 * list with a proportional bar per row and a range picker, delegating the data
 * to the `fetcher` prop.
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['acl'],

    props: {
        fetcher: {
            type: Function as PropType<BreakdownFetcher>,
            required: true,
        },
        settings: {
            type: Object as PropType<{ salesChannelId?: string | null }>,
            required: false,
            default: () => ({}),
        },
    },

    data(): { rows: BreakdownRow[]; isLoading: boolean; selectedRange: string } {
        return {
            rows: [],
            isLoading: true,
            selectedRange: '30Days',
        };
    },

    computed: {
        salesChannelId(): string | null {
            return this.settings.salesChannelId ?? null;
        },

        maxValue(): number {
            return this.rows.reduce((max, row) => Math.max(max, row.value), 0);
        },
    },

    created() {
        void this.load();
    },

    methods: {
        barWidth(row: BreakdownRow): string {
            if (this.maxValue <= 0) {
                return '0%';
            }
            return `${Math.max(2, Math.round((row.value / this.maxValue) * 100))}%`;
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
            if (!this.acl.can('order.viewer')) {
                this.isLoading = false;
                return;
            }

            this.isLoading = true;
            const { fromDate, toDate, interval } = this.rangeDates(this.selectedRange);

            try {
                this.rows = await this.fetcher(fromDate, toDate, interval, this.salesChannelId);
            } catch {
                this.rows = [];
            } finally {
                this.isLoading = false;
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
