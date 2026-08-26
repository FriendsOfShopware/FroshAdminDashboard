import { mountShopwareComponent, setAclRoles } from '@friendsofshopware/vitest-shopware-admin-bridge/test-utils';
import { describe, expect, it } from 'vitest';
import '../../src/main';

const placed = {
    uid: 'notes-1',
    widgetId: 'test-widget-body',
    size: 'medium',
    settings: { title: 'Initial' },
};

const definition = {
    id: 'test-widget-body',
    label: 'test.widget.label',
    icon: 'regular-note',
    component: 'test-widget-body',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'large'],
    settings: [{ name: 'title', type: 'text', label: 'test.widget.title' }],
};

describe('frosh-dashboard-widget', () => {
    it('renders its accessible chrome and forwards body and toolbar events', async () => {
        const wrapper = await mountShopwareComponent('frosh-dashboard-widget', {
            props: { placed, definition, editing: true },
            global: {
                mocks: { $tc: (key: string) => key },
                stubs: {
                    'mt-icon': true,
                    'sw-context-button': { template: '<div><slot name="button" /><slot /></div>' },
                    'sw-context-menu-item': { template: '<button class="size-option"><slot /></button>' },
                    'test-widget-body': {
                        template: '<button class="widget-body" @click="$emit(\'update-settings\', { title: \'Updated\' })">body</button>',
                    },
                },
            },
        });

        expect(wrapper.attributes('aria-labelledby')).toBe('frosh-widget-title-notes-1');
        expect(wrapper.get('#frosh-widget-title-notes-1').text()).toContain('test.widget.label');

        await wrapper.get('.widget-body').trigger('click');
        await wrapper.get('[aria-label="frosh-admin-dashboard.widget.configure"]').trigger('click');
        await wrapper.get('[aria-label="frosh-admin-dashboard.widget.remove"]').trigger('click');
        await wrapper.findAll('.size-option')[2].trigger('click');

        expect(wrapper.emitted('update-settings')).toEqual([[{ title: 'Updated' }]]);
        expect(wrapper.emitted('configure')).toHaveLength(1);
        expect(wrapper.emitted('remove')).toHaveLength(1);
        expect(wrapper.emitted('resize')).toEqual([['large']]);
    });

    it('renders the permission notice instead of the widget body without the required ACL role', async () => {
        setAclRoles([]);

        const wrapper = await mountShopwareComponent('frosh-dashboard-widget', {
            props: {
                placed,
                definition: { ...definition, acl: ['order.viewer'] },
            },
            global: {
                mocks: { $tc: (key: string) => key },
                stubs: {
                    'mt-icon': true,
                    'sw-context-button': true,
                    'sw-context-menu-item': true,
                    'test-widget-body': { template: '<div class="widget-body" />' },
                },
            },
        });

        expect(wrapper.find('.widget-body').exists()).toBe(false);
        expect(wrapper.get('.frosh-dashboard-widget__missing').text()).toContain(
            'frosh-admin-dashboard.widget.noAccess',
        );
    });
});
