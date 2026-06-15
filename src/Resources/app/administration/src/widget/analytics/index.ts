/**
 * Registers the analytics widgets and their registry entries. Two reusable base
 * components do the rendering:
 *  - frosh-analytics-timeseries: line/area chart with a range picker,
 *  - frosh-analytics-breakdown: ranked top-N list with proportion bars.
 * Each concrete widget only supplies its criteria/aggregation `fetcher`.
 */

import { widgetRegistry } from '../../core/widget-registry';
import type { DashboardWidget, WidgetSetting } from '../../core/widget-registry';

const { Component } = Shopware;

// Base components.
Component.register('frosh-analytics-timeseries', () => import('./_base/frosh-analytics-timeseries'));
Component.register('frosh-analytics-breakdown', () => import('./_base/frosh-analytics-breakdown'));

// Concrete widget components.
Component.register('frosh-widget-total-sales', () => import('./frosh-widget-total-sales'));
Component.register('frosh-widget-number-of-order', () => import('./frosh-widget-number-of-order'));
Component.register('frosh-widget-average-order-value', () => import('./frosh-widget-average-order-value'));
Component.register('frosh-widget-new-customer', () => import('./frosh-widget-new-customer'));
Component.register('frosh-widget-number-of-customer', () => import('./frosh-widget-number-of-customer'));
Component.register('frosh-widget-payment-method', () => import('./frosh-widget-payment-method'));
Component.register('frosh-widget-shipping-method', () => import('./frosh-widget-shipping-method'));
Component.register('frosh-widget-sales-channel', () => import('./frosh-widget-sales-channel'));
Component.register('frosh-widget-country', () => import('./frosh-widget-country'));
Component.register('frosh-widget-best-selling-product', () => import('./frosh-widget-best-selling-product'));
Component.register('frosh-widget-manufacturer', () => import('./frosh-widget-manufacturer'));
Component.register('frosh-widget-promotion-code', () => import('./frosh-widget-promotion-code'));

const salesChannelSetting: WidgetSetting = {
    name: 'salesChannelId',
    type: 'entity',
    entity: 'sales_channel',
    label: 'frosh-admin-dashboard.analytics.salesChannel',
    helpText: 'frosh-admin-dashboard.analytics.salesChannelHelp',
    default: null,
};

interface AnalyticsWidgetDef {
    id: string;
    component: string;
    label: string;
    description: string;
    icon: string;
    acl: string[];
}

const ANALYTICS_WIDGETS: AnalyticsWidgetDef[] = [
    {
        id: 'frosh-widget-total-sales',
        component: 'frosh-widget-total-sales',
        label: 'frosh-admin-dashboard.widget.totalSales.label',
        description: 'frosh-admin-dashboard.widget.totalSales.description',
        icon: 'regular-money-bill',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-number-of-order',
        component: 'frosh-widget-number-of-order',
        label: 'frosh-admin-dashboard.widget.numberOfOrder.label',
        description: 'frosh-admin-dashboard.widget.numberOfOrder.description',
        icon: 'regular-shopping-bag',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-average-order-value',
        component: 'frosh-widget-average-order-value',
        label: 'frosh-admin-dashboard.widget.averageOrderValue.label',
        description: 'frosh-admin-dashboard.widget.averageOrderValue.description',
        icon: 'regular-chart-line',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-new-customer',
        component: 'frosh-widget-new-customer',
        label: 'frosh-admin-dashboard.widget.newCustomer.label',
        description: 'frosh-admin-dashboard.widget.newCustomer.description',
        icon: 'regular-user-plus',
        acl: ['customer.viewer'],
    },
    {
        id: 'frosh-widget-number-of-customer',
        component: 'frosh-widget-number-of-customer',
        label: 'frosh-admin-dashboard.widget.numberOfCustomer.label',
        description: 'frosh-admin-dashboard.widget.numberOfCustomer.description',
        icon: 'regular-users',
        acl: ['customer.viewer'],
    },
    {
        id: 'frosh-widget-best-selling-product',
        component: 'frosh-widget-best-selling-product',
        label: 'frosh-admin-dashboard.widget.bestSellingProduct.label',
        description: 'frosh-admin-dashboard.widget.bestSellingProduct.description',
        icon: 'regular-products',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-manufacturer',
        component: 'frosh-widget-manufacturer',
        label: 'frosh-admin-dashboard.widget.manufacturer.label',
        description: 'frosh-admin-dashboard.widget.manufacturer.description',
        icon: 'regular-flag',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-country',
        component: 'frosh-widget-country',
        label: 'frosh-admin-dashboard.widget.country.label',
        description: 'frosh-admin-dashboard.widget.country.description',
        icon: 'regular-map-marker',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-payment-method',
        component: 'frosh-widget-payment-method',
        label: 'frosh-admin-dashboard.widget.paymentMethod.label',
        description: 'frosh-admin-dashboard.widget.paymentMethod.description',
        icon: 'regular-credit-card',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-shipping-method',
        component: 'frosh-widget-shipping-method',
        label: 'frosh-admin-dashboard.widget.shippingMethod.label',
        description: 'frosh-admin-dashboard.widget.shippingMethod.description',
        icon: 'regular-truck',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-sales-channel',
        component: 'frosh-widget-sales-channel',
        label: 'frosh-admin-dashboard.widget.salesChannelSales.label',
        description: 'frosh-admin-dashboard.widget.salesChannelSales.description',
        icon: 'regular-storefront',
        acl: ['order.viewer'],
    },
    {
        id: 'frosh-widget-promotion-code',
        component: 'frosh-widget-promotion-code',
        label: 'frosh-admin-dashboard.widget.promotionCode.label',
        description: 'frosh-admin-dashboard.widget.promotionCode.description',
        icon: 'regular-discount',
        acl: ['order.viewer'],
    },
];

ANALYTICS_WIDGETS.forEach((widget) => {
    const definition: DashboardWidget = {
        id: widget.id,
        label: widget.label,
        description: widget.description,
        icon: widget.icon,
        component: widget.component,
        defaultSize: 'medium',
        supportedSizes: ['medium', 'large', 'full'],
        group: 'analytics',
        acl: widget.acl,
        settings: [salesChannelSetting],
    };

    widgetRegistry.registerWidget(definition);
});
