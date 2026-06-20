import template from './frosh-widget-number-of-customer.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { SeriesPoint, TimeseriesResult } from '../_base/frosh-analytics-timeseries';
import { parseBucketDate } from '../_common/series';
import { toStorageDateTime, userTimeZone } from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface CountBucket {
    key: string;
    filter?: { countAgg?: { count: number } };
}

/**
 * Cumulative number of customers over time: total customers existing at range
 * end, walked backwards by per-bucket new registrations to build the running
 * line.
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
        async fetchNumberOfCustomers(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<TimeseriesResult> {
            const criteria = new Criteria(1, 1);

            if (salesChannelId) {
                criteria.addFilter(Criteria.equals('salesChannelId', salesChannelId));
            }

            // `total` is the cumulative customer count as of now. No upper-bound
            // filter: every customer was created in the past, so capping by
            // `lte: now` can only undercount (the count must equal COUNT(*),
            // optionally scoped to the sales channel).
            criteria.addAggregation(
                Criteria.histogram(
                    'createdAt',
                    'createdAt',
                    interval.interval,
                    interval.format,
                    Criteria.filter(
                        'filter',
                        [Criteria.range('createdAt', { gte: toStorageDateTime(fromDate), lte: toStorageDateTime(toDate) })],
                        Criteria.count('countAgg', 'id'),
                    ),
                    userTimeZone(),
                ),
            );

            const result = await this.repositoryFactory.create('customer').search(criteria, Shopware.Context.api);
            const total = result?.total ?? 0;

            const newByDate: Record<string, number> = {};
            ((result?.aggregations?.createdAt?.buckets ?? []) as CountBucket[]).forEach((bucket) => {
                newByDate[bucket.key] = bucket.filter?.countAgg?.count ?? 0;
            });

            // Walk backwards from the total, subtracting each bucket's additions.
            const keys = Object.keys(newByDate).sort();
            let running = total;
            const cumulativeByKey: Record<string, number> = {};
            for (let i = keys.length - 1; i >= 0; i -= 1) {
                cumulativeByKey[keys[i]] = running;
                running -= newByDate[keys[i]];
            }

            const series: SeriesPoint[] = keys
                .map((key) => ({ x: parseBucketDate(key), y: cumulativeByKey[key] }))
                .sort((a, b) => a.x - b.x);

            return { series, summary: total };
        },
    },
});
