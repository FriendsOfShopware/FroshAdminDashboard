# Developer guide

How the Frosh Admin Dashboard works internally, and how to extend it from your
own plugin.

## Architecture

| Concern | Location |
| --- | --- |
| Replaces the dashboard page | `module/frosh-admin-dashboard/index.ts` — a `routeMiddleware` swaps the component of the core `sw.dashboard.index` route for `frosh-dashboard-index`. Route name, navigation entry and ACL stay untouched. |
| The board / drag & drop | `component/frosh-dashboard-grid` — native HTML5 drag-and-drop, edit mode, add/remove/resize. |
| Widget chrome | `component/frosh-dashboard-widget` — header, drag handle and controls around each widget body. |
| Widget catalogue | `core/widget-registry.ts` — a singleton registry of available widgets and groups. |
| Persistence | `core/dashboard-layout.service.ts` — reads/writes the layout via `userConfigService` (`user_config` row, key `frosh-admin-dashboard.layout`). |
| Built-in widgets | `widget/` — orders, turnover (both `Component.extend` the core `sw-dashboard-statistics` to show one chart each), recent orders, recent registrations, B2B group requests and pending reviews (last N records, filterable by sales channel; group requests has inline accept/decline, pending reviews has inline approve/decline-with-confirmation), quick links, notes, tasks, and 12 analytics charts under `widget/analytics/`. |
| Analytics base components | `widget/analytics/_base/` — `frosh-analytics-timeseries` (line/area chart + range picker) and `frosh-analytics-breakdown` (ranked top-N list). Each concrete chart supplies only a `fetcher` with its DAL criteria; helpers live in `widget/analytics/_common/`. |

The stored layout (per user) looks like:

```json
{
    "frosh-admin-dashboard.layout": [
        { "uid": "frosh-widget-orders-ab12", "widgetId": "frosh-widget-orders", "size": "medium", "settings": {} },
        { "uid": "frosh-widget-notes-cd34",      "widgetId": "frosh-widget-notes",      "size": "medium", "settings": { "text": "..." } }
    ]
}
```

## Adding your own widget (from any plugin)

The registry is exposed under `Shopware.FroshDashboard`, so any other plugin can
contribute widgets:

```js
// 1. Register the component that renders the widget body.
//    It receives `settings` and `editing` props and may emit `update-settings`.
Shopware.Component.register('acme-sales-widget', () => import('./acme-sales-widget'));

// 2. Add it to the dashboard registry.
Shopware.FroshDashboard.registerWidget({
    id: 'acme-sales-widget',
    label: 'acme.dashboard.salesWidget.label', // snippet key
    icon: 'regular-chart-bar',
    component: 'acme-sales-widget',
    defaultSize: 'medium',                      // small | medium | large | full
    supportedSizes: ['medium', 'large'],        // sizes offered in the resize picker
    group: 'analytics',                         // picker section (see "Groups")
    acl: ['order.viewer'],                      // required privileges (see "Permissions")
    // unique: true,                            // allow only one placement
    settings: [                                 // generic, schema-driven config UI
        { name: 'currency', type: 'select', label: 'acme.dashboard.salesWidget.currency',
          default: 'EUR', options: [{ value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }] },
        { name: 'compact', type: 'switch', label: 'acme.dashboard.salesWidget.compact', default: false },
    ],
});
```

The widget then appears in the "Add widget" picker.

## Groups

The picker lists widgets under group headings. Built-in groups are `analytics`
and `productivity` (uncategorised widgets fall back to `other`). Assign a widget
to a group with the `group` field. Register your own group — groups sort by
`position`, and empty groups are hidden:

```js
Shopware.FroshDashboard.registerGroup({
    id: 'acme',
    label: 'acme.dashboard.group.label', // snippet key
    position: 30,                         // lower sorts first (default 100)
});
```

## Permissions

Declare the ACL privileges a widget needs with `acl: ['order.viewer', …]`. The
check uses the admin `acl` service (admins always pass). Widgets the user lacks
access to are **not hidden** — they appear greyed-out and disabled in the picker
with a tooltip listing the missing privileges, and a placed widget whose access
was later revoked renders a "missing permissions" notice instead of its body.
Inaccessible widgets are also skipped when seeding the first-run default layout.

## Per-widget configuration

There are two ways a widget owns persisted state, both stored in the
placement's `settings` object in `user_config`:

- **Declarative (recommended)** — list `settings` fields in the registry entry.
  The grid then shows a **gear icon** that opens a generic settings modal built
  from your schema. Supported field types: `text`, `textarea`, `number`,
  `switch`, `select`, `colorpicker`, and `entity` (an `sw-entity-single-select`
  bound to any DAL entity via the field's `entity` property, e.g.
  `sales_channel` — see `widget/frosh-widget-recent-orders`). Defaults are
  applied on placement. The widget reads the values from its `settings` prop
  (see `widget/frosh-widget-notes`).
- **Inline** — the widget edits itself and emits `update-settings` with a
  partial settings object that is merged and persisted (see `widget/frosh-widget-notes`,
  which combines an inline notepad with a declarative accent-colour setting).

## Sizes / resizing

`supportedSizes` is the opt-in list of column spans a widget allows. In edit
mode the resize control shows a **size picker** limited to those sizes (hidden
entirely when only one size is supported, e.g. the full-width statistics widget).
Omitting `supportedSizes` defaults to all four (`small`, `medium`, `large`,
`full`). `defaultSize` must be one of the supported sizes — otherwise it falls
back to the first supported size.

## Store screenshots

The store assets in `src/Resources/store/` are generated by the scripts in
`screenshots/` — see `screenshots/README.md`. They drive a local Chrome over CDP
(no Playwright browser download needed): `capture.mjs` takes the raw admin
captures, `marketing.mjs` wraps them with the branded headline overlays.
