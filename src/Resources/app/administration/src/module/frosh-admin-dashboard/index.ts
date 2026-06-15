import snippets from './snippet';

const { Component, Module } = Shopware;

// Modular dashboard building blocks.
Component.register('frosh-dashboard-grid', () => import('./component/frosh-dashboard-grid'));
Component.register('frosh-dashboard-widget', () => import('./component/frosh-dashboard-widget'));
Component.register('frosh-dashboard-add-widget-modal', () => import('./component/frosh-dashboard-add-widget-modal'));
Component.register('frosh-dashboard-settings-modal', () => import('./component/frosh-dashboard-settings-modal'));
Component.register('frosh-dashboard-index', () => import('./page/frosh-dashboard-index'));

// Replace the dashboard page via route middleware: when the core
// `sw.dashboard.index` route resolves, swap its rendered component for our
// modular widget board. This keeps the route name, navigation entry and ACL
// of the core dashboard untouched — only the rendered UI changes.
Module.register('frosh-admin-dashboard', {
    type: 'plugin',
    name: 'frosh-admin-dashboard',
    title: 'frosh-admin-dashboard.general.mainMenuItemGeneral',
    description: 'frosh-admin-dashboard.general.descriptionTextModule',
    version: '1.0.0',
    targetVersion: '1.0.0',

    snippets,

    routeMiddleware(next, currentRoute) {
        if (currentRoute.name === 'sw.dashboard.index') {
            currentRoute.components.default = 'frosh-dashboard-index';
        }

        next(currentRoute);
    },
});
