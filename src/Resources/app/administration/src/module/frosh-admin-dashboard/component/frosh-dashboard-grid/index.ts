import './frosh-dashboard-grid.scss';
import template from './frosh-dashboard-grid.html.twig';
import type { PlacedWidget } from '../../../../core/dashboard-layout.service';
import type { DashboardWidget, WidgetSize } from '../../../../core/widget-registry';
import { widgetRegistry } from '../../../../core/widget-registry';

/**
 * The dashboard canvas.
 *
 * Renders the user's placed widgets in a CSS grid, supports native HTML5
 * drag-and-drop re-ordering, an edit mode to add/remove/resize widgets and
 * persists every change through the layout service (user_config).
 */
export default Shopware.Component.wrapComponentConfig({
    template,

    inject: ['froshDashboardLayoutService'],

    mixins: [Shopware.Mixin.getByName('notification')],

    data(): {
        layout: PlacedWidget[];
        isLoading: boolean;
        isEditing: boolean;
        isSaving: boolean;
        hasPendingSave: boolean;
        draggedUid: string | null;
        dragOverUid: string | null;
        showAddModal: boolean;
        configuringUid: string | null;
        } {
        return {
            layout: [],
            isLoading: true,
            isEditing: false,
            isSaving: false,
            hasPendingSave: false,
            draggedUid: null,
            dragOverUid: null,
            showAddModal: false,
            configuringUid: null,
        };
    },

    computed: {
        availableWidgets(): DashboardWidget[] {
            const usedUniqueIds = new Set(
                this.layout
                    .map((placed) => widgetRegistry.getWidget(placed.widgetId))
                    .filter((widget): widget is DashboardWidget => Boolean(widget?.unique))
                    .map((widget) => widget.id),
            );

            return widgetRegistry.getWidgets().filter((widget) => !usedUniqueIds.has(widget.id));
        },

        configuringPlacement(): PlacedWidget | undefined {
            return this.layout.find((entry) => entry.uid === this.configuringUid);
        },

        configuringDefinition(): DashboardWidget | undefined {
            return this.configuringPlacement
                ? widgetRegistry.getWidget(this.configuringPlacement.widgetId)
                : undefined;
        },
    },

    created() {
        this.createdComponent();
    },

    methods: {
        async createdComponent(): Promise<void> {
            this.isLoading = true;
            try {
                const stored = await this.froshDashboardLayoutService.load();
                this.layout = stored ?? this.getDefaultLayout();
            } catch {
                this.layout = this.getDefaultLayout();
            } finally {
                this.isLoading = false;
            }
        },

        getDefaultLayout(): PlacedWidget[] {
            // First-run layout: pick a set of defaults, skipping any the user
            // lacks the ACL privileges for.
            const defaults = ['frosh-widget-number-of-order', 'frosh-widget-total-sales', 'frosh-widget-quick-links', 'frosh-widget-notes'];

            return defaults
                .map((id) => widgetRegistry.getWidget(id))
                .filter((widget): widget is DashboardWidget => Boolean(widget) && widgetRegistry.hasAccess(widget))
                .map((widget) => this.createPlacement(widget.id));
        },

        createPlacement(widgetId: string): PlacedWidget {
            const widget = widgetRegistry.getWidget(widgetId);

            // Seed the placement with the widget's declared setting defaults.
            const settings: Record<string, unknown> = {};
            (widget?.settings ?? []).forEach((field) => {
                if (field.default !== undefined) {
                    settings[field.name] = field.default;
                }
            });

            return {
                uid: `${widgetId}-${Shopware.Utils.createId()}`,
                widgetId,
                size: widget?.defaultSize ?? 'medium',
                settings,
            };
        },

        widgetDefinition(placed: PlacedWidget): DashboardWidget | undefined {
            return widgetRegistry.getWidget(placed.widgetId);
        },

        toggleEdit(): void {
            this.isEditing = !this.isEditing;
            if (!this.isEditing) {
                this.draggedUid = null;
                this.dragOverUid = null;
            }
        },

        // --- widget management -------------------------------------------------

        onAddWidget(widgetId: string): void {
            this.layout.push(this.createPlacement(widgetId));
            this.showAddModal = false;
            void this.persist();
        },

        onRemoveWidget(uid: string): void {
            this.layout = this.layout.filter((placed) => placed.uid !== uid);
            void this.persist();
        },

        onResizeWidget(uid: string, size: WidgetSize): void {
            const placed = this.layout.find((entry) => entry.uid === uid);
            if (!placed || placed.size === size) {
                return;
            }

            placed.size = size;
            void this.persist();
        },

        onWidgetSettingsUpdate(uid: string, settings: Record<string, unknown>): void {
            const placed = this.layout.find((entry) => entry.uid === uid);
            if (!placed) {
                return;
            }

            placed.settings = { ...placed.settings, ...settings };
            void this.persist();
        },

        // --- per-widget configuration -----------------------------------------

        onConfigureWidget(uid: string): void {
            this.configuringUid = uid;
        },

        onConfigureSave(settings: Record<string, unknown>): void {
            if (this.configuringUid === null) {
                return;
            }

            // A full replace from the settings modal (it edits the whole object).
            const placed = this.layout.find((entry) => entry.uid === this.configuringUid);
            if (placed) {
                placed.settings = { ...settings };
                void this.persist();
            }

            this.configuringUid = null;
        },

        // --- drag & drop -------------------------------------------------------

        onDragStart(uid: string, event: DragEvent): void {
            if (!this.isEditing) {
                return;
            }
            this.draggedUid = uid;
            event.dataTransfer?.setData('text/plain', uid);
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
            }
        },

        onDragOver(uid: string, event: DragEvent): void {
            if (!this.isEditing || this.draggedUid === null) {
                return;
            }
            event.preventDefault();
            this.dragOverUid = uid;
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        },

        onDrop(targetUid: string): void {
            if (!this.isEditing || this.draggedUid === null || this.draggedUid === targetUid) {
                this.resetDragState();
                return;
            }

            const fromIndex = this.layout.findIndex((entry) => entry.uid === this.draggedUid);
            const toIndex = this.layout.findIndex((entry) => entry.uid === targetUid);

            if (fromIndex === -1 || toIndex === -1) {
                this.resetDragState();
                return;
            }

            const next = [...this.layout];
            const [moved] = next.splice(fromIndex, 1);
            const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
            next.splice(insertIndex, 0, moved);
            this.layout = next;

            this.resetDragState();
            void this.persist();
        },

        onDragEnd(): void {
            this.resetDragState();
        },

        resetDragState(): void {
            this.draggedUid = null;
            this.dragOverUid = null;
        },

        // --- persistence -------------------------------------------------------

        copyLayout(): PlacedWidget[] {
            return this.layout.map((placed) => ({
                uid: placed.uid,
                widgetId: placed.widgetId,
                size: placed.size,
                settings: { ...placed.settings },
            }));
        },

        async persist(): Promise<void> {
            if (this.isSaving) {
                this.hasPendingSave = true;
                return;
            }

            this.isSaving = true;
            try {
                do {
                    this.hasPendingSave = false;
                    await this.froshDashboardLayoutService.save(this.copyLayout());
                } while (this.hasPendingSave);
            } catch {
                this.createNotificationError({
                    message: this.$tc('frosh-admin-dashboard.notification.saveError'),
                });
            } finally {
                this.isSaving = false;
                if (this.hasPendingSave) {
                    void this.persist();
                }
            }
        },
    },
});
