import './frosh-widget-gmv.scss';
import template from './frosh-widget-gmv.html.twig';
import type { PropType } from 'vue';
import { MONTH_INTERVAL } from '../_common/interval';
import {
    baseOrderCriteria,
    dateRangeFilter,
    excludeSaasTestOrders,
    groupedByCurrencyFactorHistogram,
} from '../_common/order-criteria';
import { normaliseAmount, parseCurrencyFactor, roundMoney } from '../_common/money';

const { Criteria } = Shopware.Data;

const CALENDAR_YEARS = 3;
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

interface GmvSettings {
    salesChannelId?: string | null;
}

/**
 * GMV table matching Shopware Commercial's TurnoverCollector: sum of live
 * `order.amount_total` (gross), currency-normalised, excluding SaaS test orders.
 * Shows the last 3 calendar years plus rolling 6 / 12 / 18 month totals.
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
    },

    methods: {
        formatMoney(value: number): string {
            return this.currencyFilter(value, this.systemCurrencyISOCode, 2);
        },

        /** First day of the oldest calendar year we display (UTC noon, date-safe). */
        rangeStart(): Date {
            const year = new Date().getFullYear() - (CALENDAR_YEARS - 1);

            return new Date(Date.UTC(year, 0, 1, 12, 0, 0));
        },

        calendarYears(): number[] {
            const currentYear = new Date().getFullYear();

            return Array.from({ length: CALENDAR_YEARS }, (_, index) => currentYear - index);
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

        buildRows(amountByMonth: Record<string, number>): GmvRow[] {
            const rows: GmvRow[] = this.calendarYears().map((year) => {
                const prefix = `${year}-`;
                const value = roundMoney(
                    Object.entries(amountByMonth)
                        .filter(([key]) => key.startsWith(prefix))
                        .reduce((sum, [, amount]) => sum + amount, 0),
                );

                return {
                    id: `year-${year}`,
                    label: String(year),
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
                const fromDate = this.rangeStart();
                const toDate = new Date();
                const criteria = excludeSaasTestOrders(baseOrderCriteria(this.salesChannelId));
                criteria
                    .addFilter(dateRangeFilter(fromDate, toDate))
                    .addAggregation(
                        groupedByCurrencyFactorHistogram(
                            MONTH_INTERVAL,
                            Criteria.sum('sumAmount', 'amountTotal'),
                            'groupedByCurrencyFactor',
                        ),
                    );

                const result = await this.repositoryFactory.create('order').search(criteria, Shopware.Context.api);
                const amountByMonth: Record<string, number> = {};

                ((result?.aggregations?.groupedByCurrencyFactor?.buckets ?? []) as CurrencyBucket[]).forEach(
                    (currencyBucket) => {
                        const factor = parseCurrencyFactor(currencyBucket.key);
                        if (!factor) {
                            return;
                        }

                        (currencyBucket.orderDate?.buckets ?? []).forEach((dateBucket) => {
                            const monthKey = dateBucket.key.slice(0, 7);
                            amountByMonth[monthKey] = roundMoney(
                                (amountByMonth[monthKey] ?? 0) +
                                    normaliseAmount(dateBucket.sumAmount?.sum ?? 0, factor),
                            );
                        });
                    },
                );

                this.rows = this.buildRows(amountByMonth);
            } catch {
                this.rows = [];
            } finally {
                this.isLoading = false;
            }
        },
    },
});
