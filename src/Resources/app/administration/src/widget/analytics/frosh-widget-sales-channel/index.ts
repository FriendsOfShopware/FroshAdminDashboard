import template from './frosh-widget-sales-channel.html.twig';
import type { PropType } from 'vue';
import type { Interval } from '../_common/interval';
import type { BreakdownRow } from '../_base/frosh-analytics-breakdown';
import { baseOrderCriteria, currencyAggregation, dateRangeFilter, mapCurrencyFactors } from '../_common/order-criteria';

const { Criteria } = Shopware.Data;

interface ChannelBucket {
    key: string;
    currencyGroup?: { buckets: Array<{ key: string; sumAmount?: { sum: number } }> };
}

/** Sales per sales channel (currency-normalised). */
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

    computed: {
        currencyFilter() {
            return Shopware.Filter.getByName('currency');
        },
        systemCurrencyISOCode(): string {
            return Shopware.Store.get('session')?.currency?.isoCode ?? 'EUR';
        },
    },

    methods: {
        async fetchSalesChannels(
            fromDate: Date,
            toDate: Date,
            interval: Interval,
            salesChannelId: string | null,
        ): Promise<BreakdownRow[]> {
            const criteria = baseOrderCriteria(salesChannelId);
            criteria
                .addFilter(dateRangeFilter(fromDate, toDate))
                .addAggregation(currencyAggregation())
                .addAggregation(
                    Criteria.terms(
                        'salesChannelSales',
                        'salesChannelId',
                        null,
                        null,
                        Criteria.terms('currencyGroup', 'currencyId', null, null, Criteria.sum('sumAmount', 'amountTotal')),
                    ),
                );

            const result = await this.repositoryFactory.create('order').search(criteria, Shopware.Context.api);
            const aggregations = result?.aggregations ?? {};
            const factors = mapCurrencyFactors(aggregations.currencies?.entities ?? []);

            const totalById: Record<string, number> = {};
            ((aggregations.salesChannelSales?.buckets ?? []) as ChannelBucket[]).forEach((channelBucket) => {
                const channelTotal = (channelBucket.currencyGroup?.buckets ?? []).reduce((sum, currencyBucket) => {
                    const factor = factors[currencyBucket.key];
                    return factor ? sum + (currencyBucket.sumAmount?.sum ?? 0) / factor : sum;
                }, 0);
                totalById[channelBucket.key] = channelTotal;
            });

            const ids = Object.keys(totalById);
            if (!ids.length) {
                return [];
            }

            const nameCriteria = new Criteria(1, ids.length);
            nameCriteria.setIds(ids);
            const channels = await this.repositoryFactory.create('sales_channel').search(nameCriteria, Shopware.Context.api);

            return channels
                .map((channel: { id: string; translated?: { name?: string }; name?: string }) => ({
                    id: channel.id,
                    name: channel.translated?.name ?? channel.name ?? channel.id,
                    value: totalById[channel.id] ?? 0,
                    formattedValue: this.currencyFilter(totalById[channel.id] ?? 0, this.systemCurrencyISOCode, 2),
                }))
                .sort((a: BreakdownRow, b: BreakdownRow) => b.value - a.value);
        },
    },
});
