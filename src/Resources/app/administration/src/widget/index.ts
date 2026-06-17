/**
 * Registers the built-in widget components and adds them to the widget
 * registry. Adding a new built-in widget means: register the component, then
 * push a registry entry here.
 *
 * Each entry may declare:
 *  - `supportedSizes`: the sizes offered in the resize picker (opt-in),
 *  - `settings`: a schema rendered by the generic settings modal,
 *  - `group`: the picker section the widget is listed under.
 */

import { widgetRegistry } from '../core/widget-registry';
import './analytics';

const { Component } = Shopware;

// Built-in groups shown as sections in the "Add widget" picker. Plugins may add
// more via `Shopware.FroshDashboard.registerGroup`.
widgetRegistry.registerGroup({ id: 'analytics', label: 'frosh-admin-dashboard.group.analytics', position: 10 });
widgetRegistry.registerGroup({ id: 'operations', label: 'frosh-admin-dashboard.group.operations', position: 20 });
widgetRegistry.registerGroup({ id: 'productivity', label: 'frosh-admin-dashboard.group.productivity', position: 30 });

Component.register('frosh-widget-notes', () => import('./frosh-widget-notes'));
Component.register('frosh-widget-tasks', () => import('./frosh-widget-tasks'));
Component.register('frosh-widget-quick-links', () => import('./frosh-widget-quick-links'));
Component.register('frosh-widget-recent-orders', () => import('./frosh-widget-recent-orders'));
Component.register('frosh-widget-recent-customers', () => import('./frosh-widget-recent-customers'));
Component.register('frosh-widget-group-requests', () => import('./frosh-widget-group-requests'));
Component.register('frosh-widget-pending-reviews', () => import('./frosh-widget-pending-reviews'));

// Orders and turnover widgets extend the core statistics component so they
// inherit all of its data fetching, ACL and range logic while rendering just
// one chart each.
Component.extend('frosh-widget-orders', 'sw-dashboard-statistics', () => import('./frosh-widget-orders'));
Component.extend('frosh-widget-turnover', 'sw-dashboard-statistics', () => import('./frosh-widget-turnover'));

widgetRegistry.registerWidget({
    id: 'frosh-widget-orders',
    label: 'frosh-admin-dashboard.widget.orders.label',
    description: 'frosh-admin-dashboard.widget.orders.description',
    icon: 'regular-shopping-bag',
    component: 'frosh-widget-orders',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    unique: true,
    group: 'analytics',
    acl: ['order.viewer'],
});

widgetRegistry.registerWidget({
    id: 'frosh-widget-turnover',
    label: 'frosh-admin-dashboard.widget.turnover.label',
    description: 'frosh-admin-dashboard.widget.turnover.description',
    icon: 'regular-chart-line',
    component: 'frosh-widget-turnover',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    unique: true,
    group: 'analytics',
    acl: ['order.viewer'],
});

widgetRegistry.registerWidget({
    id: 'frosh-widget-recent-orders',
    label: 'frosh-admin-dashboard.widget.recentOrders.label',
    description: 'frosh-admin-dashboard.widget.recentOrders.description',
    icon: 'regular-list',
    component: 'frosh-widget-recent-orders',
    defaultSize: 'large',
    supportedSizes: ['medium', 'large', 'full'],
    group: 'operations',
    acl: ['order.viewer'],
    settings: [
        {
            name: 'salesChannelId',
            type: 'entity',
            entity: 'sales_channel',
            label: 'frosh-admin-dashboard.widget.recentOrders.salesChannel',
            helpText: 'frosh-admin-dashboard.widget.recentOrders.salesChannelHelp',
            default: null,
        },
        {
            name: 'limit',
            type: 'select',
            label: 'frosh-admin-dashboard.widget.recentOrders.limit',
            default: 10,
            options: [
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 50, label: '50' },
            ],
        },
    ],
});

widgetRegistry.registerWidget({
    id: 'frosh-widget-recent-customers',
    label: 'frosh-admin-dashboard.widget.recentCustomers.label',
    description: 'frosh-admin-dashboard.widget.recentCustomers.description',
    icon: 'regular-user-plus',
    component: 'frosh-widget-recent-customers',
    defaultSize: 'large',
    supportedSizes: ['medium', 'large', 'full'],
    group: 'operations',
    acl: ['customer.viewer'],
    settings: [
        {
            name: 'salesChannelId',
            type: 'entity',
            entity: 'sales_channel',
            label: 'frosh-admin-dashboard.widget.recentCustomers.salesChannel',
            helpText: 'frosh-admin-dashboard.widget.recentCustomers.salesChannelHelp',
            default: null,
        },
        {
            name: 'limit',
            type: 'select',
            label: 'frosh-admin-dashboard.widget.recentCustomers.limit',
            default: 10,
            options: [
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 50, label: '50' },
            ],
        },
    ],
});

widgetRegistry.registerWidget({
    id: 'frosh-widget-group-requests',
    label: 'frosh-admin-dashboard.widget.groupRequests.label',
    description: 'frosh-admin-dashboard.widget.groupRequests.description',
    icon: 'regular-briefcase',
    component: 'frosh-widget-group-requests',
    defaultSize: 'large',
    supportedSizes: ['medium', 'large', 'full'],
    group: 'operations',
    acl: ['customer.viewer'],
    settings: [
        {
            name: 'salesChannelId',
            type: 'entity',
            entity: 'sales_channel',
            label: 'frosh-admin-dashboard.widget.groupRequests.salesChannel',
            helpText: 'frosh-admin-dashboard.widget.groupRequests.salesChannelHelp',
            default: null,
        },
        {
            name: 'limit',
            type: 'select',
            label: 'frosh-admin-dashboard.widget.groupRequests.limit',
            default: 10,
            options: [
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 50, label: '50' },
            ],
        },
    ],
});

widgetRegistry.registerWidget({
    id: 'frosh-widget-pending-reviews',
    label: 'frosh-admin-dashboard.widget.pendingReviews.label',
    description: 'frosh-admin-dashboard.widget.pendingReviews.description',
    icon: 'regular-star',
    component: 'frosh-widget-pending-reviews',
    defaultSize: 'large',
    supportedSizes: ['medium', 'large', 'full'],
    group: 'operations',
    acl: ['review.viewer'],
    settings: [
        {
            name: 'salesChannelId',
            type: 'entity',
            entity: 'sales_channel',
            label: 'frosh-admin-dashboard.widget.pendingReviews.salesChannel',
            helpText: 'frosh-admin-dashboard.widget.pendingReviews.salesChannelHelp',
            default: null,
        },
        {
            name: 'limit',
            type: 'select',
            label: 'frosh-admin-dashboard.widget.pendingReviews.limit',
            default: 10,
            options: [
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 50, label: '50' },
            ],
        },
    ],
});

widgetRegistry.registerWidget({
    id: 'frosh-widget-quick-links',
    label: 'frosh-admin-dashboard.widget.quickLinks.label',
    description: 'frosh-admin-dashboard.widget.quickLinks.description',
    icon: 'regular-bookmark',
    component: 'frosh-widget-quick-links',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'large', 'full'],
    group: 'productivity',
});

widgetRegistry.registerWidget({
    id: 'frosh-widget-notes',
    label: 'frosh-admin-dashboard.widget.notes.label',
    description: 'frosh-admin-dashboard.widget.notes.description',
    icon: 'regular-file-text',
    component: 'frosh-widget-notes',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'large'],
    group: 'productivity',
    settings: [
        {
            name: 'accent',
            type: 'colorpicker',
            label: 'frosh-admin-dashboard.widget.notes.accent',
            default: '#fbd34d',
        },
    ],
});

widgetRegistry.registerWidget({
    id: 'frosh-widget-tasks',
    label: 'frosh-admin-dashboard.widget.tasks.label',
    description: 'frosh-admin-dashboard.widget.tasks.description',
    icon: 'regular-check-square',
    component: 'frosh-widget-tasks',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'large'],
    group: 'productivity',
    settings: [
        {
            name: 'hideCompleted',
            type: 'switch',
            label: 'frosh-admin-dashboard.widget.tasks.hideCompleted',
            default: false,
        },
    ],
});
