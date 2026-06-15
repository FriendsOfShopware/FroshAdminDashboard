import './frosh-widget-quick-links.scss';
import template from './frosh-widget-quick-links.html.twig';

interface QuickLink {
    route: string;
    icon: string;
    label: string;
}

export default Shopware.Component.wrapComponentConfig({
    template,

    computed: {
        links(): QuickLink[] {
            return [
                { route: 'sw.product.index', icon: 'regular-products', label: 'frosh-admin-dashboard.widget.quickLinks.products' },
                { route: 'sw.order.index', icon: 'regular-shopping-bag', label: 'frosh-admin-dashboard.widget.quickLinks.orders' },
                { route: 'sw.customer.index', icon: 'regular-users', label: 'frosh-admin-dashboard.widget.quickLinks.customers' },
                { route: 'sw.category.index', icon: 'regular-content', label: 'frosh-admin-dashboard.widget.quickLinks.categories' },
                { route: 'sw.settings.index', icon: 'regular-cog', label: 'frosh-admin-dashboard.widget.quickLinks.settings' },
            ];
        },
    },
});
