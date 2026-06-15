/**
 * Wires the dashboard core into the running administration:
 *  - exposes the widget registry under `Shopware.FroshDashboard` so other
 *    plugins can register widgets,
 *  - registers the layout service in the DI container.
 */

import { widgetRegistry } from './widget-registry';
import DashboardLayoutService from './dashboard-layout.service';

const { Application } = Shopware;

// Public, plugin-facing API.
(Shopware as unknown as { FroshDashboard: unknown }).FroshDashboard = {
    registerWidget: widgetRegistry.registerWidget.bind(widgetRegistry),
    getWidget: widgetRegistry.getWidget.bind(widgetRegistry),
    getWidgets: widgetRegistry.getWidgets.bind(widgetRegistry),
    registerGroup: widgetRegistry.registerGroup.bind(widgetRegistry),
    getGroup: widgetRegistry.getGroup.bind(widgetRegistry),
    getGroups: widgetRegistry.getGroups.bind(widgetRegistry),
    hasAccess: widgetRegistry.hasAccess.bind(widgetRegistry),
    missingPrivileges: widgetRegistry.missingPrivileges.bind(widgetRegistry),
};

Application.addServiceProvider('froshDashboardLayoutService', () => {
    return new DashboardLayoutService(Shopware.Service('userConfigService'));
});
