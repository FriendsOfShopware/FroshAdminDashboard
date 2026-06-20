import template from './frosh-widget-new-customer.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { TimeseriesResult } from '../_base/frosh-analytics-timeseries';
import { bucketsToSeries } from '../_common/series';
import { toStorageDateTime, userTimeZone } from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface CountBucket {
    key: string;
    countAgg?: { count: number };
}

/** New customers (registrations) over time. */
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
        async fetchNewCustomers(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<TimeseriesResult> {
            const criteria = new Criteria(1, 1);
            criteria.setTotalCountMode(0);

            if (salesChannelId) {
                criteria.addFilter(Criteria.equals('salesChannelId', salesChannelId));
            }

            criteria
                .addFilter(Criteria.range('createdAt', { gte: toStorageDateTime(fromDate), lte: toStorageDateTime(toDate) }))
                .addAggregation(
                    Criteria.histogram(
                        'createdAt',
                        'createdAt',
                        interval.interval,
                        interval.format,
                        Criteria.count('countAgg', 'id'),
                        userTimeZone(),
                    ),
                );

            const result = await this.repositoryFactory.create('customer').search(criteria, Shopware.Context.api);
            const buckets = (result?.aggregations?.createdAt?.buckets ?? []) as CountBucket[];

            const series = bucketsToSeries(buckets, (bucket) => (bucket as CountBucket).countAgg?.count ?? 0);
            const summary = series.reduce((sum, point) => sum + point.y, 0);

            return { series, summary };
        },
    },
});
