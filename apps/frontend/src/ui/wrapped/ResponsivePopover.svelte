<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	import { layoutStore } from '#stores/LayoutStore.svelte.js';
	import { OVERLAY_CLOSE_CLASS } from '#ui/lib/overlay.js';
	import { inResponsiveLayer, markResponsiveLayer } from '#ui/lib/responsive-layer.js';
	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import * as Drawer from '#ui/primitives-new/drawer/index.js';
	import * as Popover from '#ui/primitives-new/popover/index.js';

	interface Props {
		open?: boolean;
		/**
		 * Required, unlike a bare popover: vaul needs a Title in the DOM for a11y.
		 * `hideHeader` is the escape hatch for call sites whose card looks wrong with a
		 * heading on it.
		 */
		title: string;
		description?: string;
		/**
		 * Keep the title accessible (screen readers) but hide it visually. `true` hides it
		 * on both branches; `'popover'` / `'drawer'` hide it on one — which is the common
		 * case, since a sheet needs a heading to be legible while the desktop card usually
		 * sits directly under a trigger that already names it.
		 */
		hideHeader?: boolean | 'popover' | 'drawer';
		/** Extra classes for the header wrapper, e.g. `text-center`. */
		headerClass?: string;
		/** Disables the trigger itself. Buttonish only renders `aria-disabled`, so a
		 *  disabled-looking trigger still opens the layer unless this is set. */
		disabled?: boolean;
		/**
		 * Anchoring, and therefore desktop-only: the drawer is always a full-width bottom
		 * sheet, so these are silently irrelevant below `lg`. Don't reach for them to fix
		 * a mobile layout.
		 */
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		/**
		 * Popover-only. This is the floating card's own box — width (popover-content
		 * defaults to `w-72`), padding, max-height. None of it means anything to a sheet
		 * pinned to the viewport, hence the split from `drawerClass`.
		 */
		class?: string;
		/** Drawer-only, for the rare sheet that wants a different height cap. */
		drawerClass?: string;
		trigger?: Snippet;
		children: Snippet;
		footer?: Snippet;
		onOpenChange?: (open: boolean) => void;
	}

	const labels = getUiLabels();

	let {
		open = $bindable(false),
		title,
		description = '',
		hideHeader = false,
		headerClass = 'text-left',
		disabled = false,
		side = 'bottom',
		align = 'center',
		sideOffset = 4,
		class: className = '',
		drawerClass = '',
		trigger,
		children,
		footer,
		onOpenChange
	}: Props = $props();

	// Init-time constant: whether some ResponsiveModal/ResponsivePopover is already open
	// around us. On touch that ancestor is a drawer, and stacking a plain `Drawer.Root`
	// inside one breaks both — see responsive-layer.ts.
	const DrawerRoot = inResponsiveLayer() ? Drawer.NestedRoot : Drawer.Root;
	markResponsiveLayer();

	const headerHidden = $derived(
		hideHeader === true || hideHeader === (layoutStore.touch ? 'drawer' : 'popover')
	);
</script>

{#if layoutStore.touch}
	<!-- Same trade as ResponsiveModal: an anchored card next to a 32px icon button is
	     unusable on a phone, and `shouldScaleBackground` stays off because scaling needs
	     a `[vaul-drawer-wrapper]` element around the app, which this layout doesn't have. -->
	<DrawerRoot bind:open {onOpenChange} shouldScaleBackground={false}>
		{#if trigger}
			<Drawer.Trigger class="flex" {disabled}>
				{@render trigger()}
			</Drawer.Trigger>
		{/if}

		<!-- The `!`s are load-bearing: drawer-content sets its own max-height and radius
		     through data-attribute variants, which outrank plain utility classes. -->
		<Drawer.Content
			class={`!max-h-[calc(85dvh-var(--keyboard-inset,0px))] !rounded-t-xl pb-safe text-sm ${drawerClass}`}>
			<!-- Extra top padding on top of drawer-header's `p-4`: the grabber sits right
			     above the title, and 16px leaves the sheet looking cramped against it. -->
			<Drawer.Header class={headerHidden ? 'sr-only' : `pt-5 pb-3 ${headerClass}`}>
				<Drawer.Title>{title}</Drawer.Title>
				{#if description && !headerHidden}
					<Drawer.Description>{description}</Drawer.Description>
				{/if}
			</Drawer.Header>

			<!-- Only the body scrolls, so the grabber and footer stay put. `min-h-0` lets it
			     shrink inside the flex column; vaul suspends dragging until it's scrolled
			     back to the top.
			     `[&>*]:shrink-0` is what makes it actually scroll: flex items default to
			     `shrink: 1`, so a long child gets squashed to fit and its own content
			     overflows *it* instead of the scroller — height caps out, no scrollbar.
			     `pb-4` lives inside the scroller on purpose: the clip box of an
			     `overflow-*-auto` container applies to both axes, so without it the last
			     row's offset shadow is sheared off. -->
			<div class="flex flex-col grow gap-4 px-4 pb-4 overflow-y-auto min-h-0 [&>*]:shrink-0">
				{@render children()}
			</div>

			{#if footer}
				<Drawer.Footer class="border-line gap-2 border-t pt-3">
					{@render footer()}
				</Drawer.Footer>
			{/if}

			<!-- Drag-to-dismiss is touch-only and several callers have no cancel button of
			     their own. Classes mirror dialog-content's close so every sheet in the app
			     shares one affordance. -->
			<Drawer.Close class={OVERLAY_CLOSE_CLASS}>
				<XIcon />
				<span class="sr-only">{labels.close}</span>
			</Drawer.Close>
		</Drawer.Content>
	</DrawerRoot>
{:else}
	<Popover.Root bind:open {onOpenChange}>
		{#if trigger}
			<Popover.Trigger class="flex" {disabled}>
				{@render trigger()}
			</Popover.Trigger>
		{/if}

		<!-- `preventScroll` is popover-content's own default here (true, unlike bits-ui),
		     so it isn't repeated. -->
		<!-- `[&>*]:shrink-0` for the same reason as the sheet body: a call site that caps
		     the card's height and scrolls it needs its children to keep their size. -->
		<Popover.Content
			{side}
			{align}
			{sideOffset}
			class={`flex flex-col [&>*]:shrink-0 ${className}`}>
			{#if !headerHidden}
				<div class={`flex flex-col gap-1.5 pb-3 ${headerClass}`}>
					<h2 class="text-ink text-base font-semibold leading-tight">
						{title}
					</h2>
					{#if description}
						<p class="text-muted-foreground text-xs">{description}</p>
					{/if}
				</div>
			{/if}

			{@render children()}

			{#if footer}
				<!-- Not Drawer.Footer's stacked full-width buttons: on a 288px card the
				     actions read as a right-aligned row, the way the dialog footer does. -->
				<div class="flex justify-end gap-2 pt-3">
					{@render footer()}
				</div>
			{/if}
		</Popover.Content>
	</Popover.Root>
{/if}
