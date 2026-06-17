import template from './frosh-widget-total-sales.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { SeriesPoint, TimeseriesResult } from '../_base/frosh-analytics-timeseries';
import { parseBucketDate } from '../_common/series';
import {
    baseOrderCriteria,
    dateRangeFilter,
    groupedByCurrencyFactorHistogram,
    parseCurrencyFactor,
} from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface CurrencyBucket {
    key: string | number;
    orderDate?: { buckets: Array<{ key: string; sumAmount?: { sum: number } }> };
}

/** Total sales over time (currency-normalised order amounts). */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['repositoryFactory'],

    props: {
        settings: {
            type: Object as PropType<{ salesChannelId?: string | null }>,
            required: false,
            default: () => ({}),
        },
    },

    methods: {
        async fetchTotalSales(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<TimeseriesResult> {
            const criteria = baseOrderCriteria(salesChannelId);
            criteria
                .addFilter(dateRangeFilter(fromDate, toDate))
                .addAggregation(
                    groupedByCurrencyFactorHistogram(interval, Criteria.sum('sumAmount', 'amountTotal'), 'groupedByCurrencyFactor'),
                );

            const result = await this.repositoryFactory.create('order').search(criteria, Shopware.Context.api);
            const aggregations = result?.aggregations ?? {};

            const detail: Record<string, number> = {};
            let summary = 0;

            ((aggregations.groupedByCurrencyFactor?.buckets ?? []) as CurrencyBucket[]).forEach((currencyBucket) => {
                const factor = parseCurrencyFactor(currencyBucket.key);
                if (!factor) {
                    return;
                }

                (currencyBucket.orderDate?.buckets ?? []).forEach((dateBucket) => {
                    const amount = (dateBucket.sumAmount?.sum ?? 0) / factor;
                    detail[dateBucket.key] = (detail[dateBucket.key] ?? 0) + amount;
                    summary += amount;
                });
            });

            const series: SeriesPoint[] = Object.keys(detail)
                .map((key) => ({ x: parseBucketDate(key), y: detail[key] }))
                .sort((a, b) => a.x - b.x);

            return { series, summary };
        },
    },
});
