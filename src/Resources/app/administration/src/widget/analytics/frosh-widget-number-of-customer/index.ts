import template from './frosh-widget-number-of-customer.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { SeriesPoint, TimeseriesResult } from '../_base/frosh-analytics-timeseries';
import { parseBucketDate } from '../_common/series';

const { Criteria } = Shopware.Data;

interface CountBucket {
    key: string;
    filter?: { countAgg?: { count: number } };
}

function toStorageDate(date: Date): string {
    return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
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

            // Total customers existing up to the end of the range.
            criteria.addFilter(Criteria.range('createdAt', { lte: toStorageDate(toDate) }));
            criteria.addAggregation(
                Criteria.histogram(
                    'createdAt',
                    'createdAt',
                    interval.interval,
                    interval.format,
                    Criteria.filter(
                        'filter',
                        [Criteria.range('createdAt', { gte: toStorageDate(fromDate), lte: toStorageDate(toDate) })],
                        Criteria.count('countAgg', 'id'),
                    ),
                    null,
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
