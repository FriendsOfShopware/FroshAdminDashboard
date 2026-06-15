import './frosh-dashboard-index.scss';
import template from './frosh-dashboard-index.html.twig';

/** Page shell rendered for the dashboard route; hosts the widget grid. */
export default Shopware.Component.wrapComponentConfig({
    template,

    metaInfo(): { title: string } {
        return {
            title: this.$createTitle(),
        };
    },
});
