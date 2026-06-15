import template from './frosh-widget-number-of-order.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { TimeseriesResult } from '../_base/frosh-analytics-timeseries';
import { bucketsToSeries } from '../_common/series';
import { baseOrderCriteria, dateRangeFilter, groupedByDateHistogram } from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface CountBucket {
    key: string;
    countAgg?: { count: number };
}

/** Number of orders over time. */
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
        async fetchNumberOfOrders(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<TimeseriesResult> {
            const criteria = baseOrderCriteria(salesChannelId);
            criteria
                .addFilter(dateRangeFilter(fromDate, toDate))
                .addAggregation(groupedByDateHistogram(interval, Criteria.count('countAgg', 'id')));

            const result = await this.repositoryFactory.create('order').search(criteria, Shopware.Context.api);
            const buckets = (result?.aggregations?.groupedByDate?.buckets ?? []) as CountBucket[];

            const series = bucketsToSeries(buckets, (bucket) => (bucket as CountBucket).countAgg?.count ?? 0);
            const summary = series.reduce((sum, point) => sum + point.y, 0);

            return { series, summary };
        },
    },
});
