import template from './frosh-widget-average-order-value.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { SeriesPoint, TimeseriesResult } from '../_base/frosh-analytics-timeseries';
import { parseBucketDate } from '../_common/series';
import {
    baseOrderCriteria,
    dateRangeFilter,
    groupedByCurrencyFactorHistogram,
    groupedByDateHistogram,
    parseCurrencyFactor,
} from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface CurrencyBucket {
    key: string | number;
    orderDate?: { buckets: Array<{ key: string; sumAmount?: { sum: number } }> };
}
interface CountBucket {
    key: string;
    countAgg?: { count: number };
}

/**
 * Average order value over time = currency-normalised total per bucket divided
 * by the order count per bucket (gross variant).
 */
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
        async fetchAverageOrderValue(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<TimeseriesResult> {
            const criteria = baseOrderCriteria(salesChannelId);
            criteria
                .addFilter(dateRangeFilter(fromDate, toDate))
                .addAggregation(
                    groupedByCurrencyFactorHistogram(interval, Criteria.sum('sumAmount', 'amountTotal'), 'sumGroupedByCurrencyFactor'),
                )
                .addAggregation(groupedByDateHistogram(interval, Criteria.count('countAgg', 'id')));

            const result = await this.repositoryFactory.create('order').search(criteria, Shopware.Context.api);
            const aggregations = result?.aggregations ?? {};

            const sumByDate: Record<string, number> = {};
            const countByDate: Record<string, number> = {};

            ((aggregations.sumGroupedByCurrencyFactor?.buckets ?? []) as CurrencyBucket[]).forEach((currencyBucket) => {
                const factor = parseCurrencyFactor(currencyBucket.key);
                if (!factor) {
                    return;
                }
                (currencyBucket.orderDate?.buckets ?? []).forEach((dateBucket) => {
                    sumByDate[dateBucket.key] = (sumByDate[dateBucket.key] ?? 0) + (dateBucket.sumAmount?.sum ?? 0) / factor;
                });
            });

            ((aggregations.groupedByDate?.buckets ?? []) as CountBucket[]).forEach((bucket) => {
                countByDate[bucket.key] = (countByDate[bucket.key] ?? 0) + (bucket.countAgg?.count ?? 0);
            });

            const series: SeriesPoint[] = Object.keys(sumByDate)
                .map((key) => {
                    const count = countByDate[key] ?? 0;
                    return { x: parseBucketDate(key), y: count === 0 ? 0 : sumByDate[key] / count };
                })
                .sort((a, b) => a.x - b.x);

            const totalSum = Object.values(sumByDate).reduce((s, v) => s + v, 0);
            const totalCount = Object.values(countByDate).reduce((s, v) => s + v, 0);
            const summary = totalCount === 0 ? 0 : totalSum / totalCount;

            return { series, summary };
        },
    },
});
