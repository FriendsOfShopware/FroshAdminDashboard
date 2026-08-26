import { mountShopwareComponent, setAclRoles } from '@friendsofshopware/vitest-shopware-admin-bridge/test-utils';
import { describe, expect, it } from 'vitest';
import '../../src/main';

const allowedWidget = {
    id: 'allowed-widget',
    label: 'test.allowed',
    icon: 'regular-checkmark',
    component: 'allowed-widget',
    group: 'analytics',
};

const restrictedWidget = {
    id: 'restricted-widget',
    label: 'test.restricted',
    icon: 'regular-lock',
    component: 'restricted-widget',
    group: 'missing-group',
    acl: ['order.viewer'],
};

describe('frosh-dashboard-add-widget-modal', () => {
    it('groups widgets and prevents selecting one without its ACL role', async () => {
        setAclRoles([]);

        const wrapper = await mountShopwareComponent('frosh-dashboard-add-widget-modal', {
            props: { widgets: [restrictedWidget, allowedWidget] },
            global: {
                mocks: { $tc: (key: string) => key },
                stubs: {
                    'mt-button': true,
                    'mt-icon': true,
                    'sw-modal': { template: '<div><slot /><slot name="modal-footer" /></div>' },
                },
            },
        });

        expect(wrapper.vm.groupedWidgets.map((section: { group: { id: string } }) => section.group.id)).toEqual([
            'analytics',
            'other',
        ]);

        wrapper.vm.onSelect(restrictedWidget);
        wrapper.vm.onSelect(allowedWidget);

        expect(wrapper.emitted('add')).toEqual([['allowed-widget']]);
        expect(wrapper.get('button.is--disabled').attributes('disabled')).toBeDefined();
    });
});
