<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	import { layoutStore } from '#stores/LayoutStore.svelte.js';
	import { OVERLAY_CLOSE_CLASS } from '#ui/lib/overlay.js';
	import { inResponsiveLayer, markResponsiveLayer } from '#ui/lib/responsive-layer.js';
	import { scrollEdges } from '#ui/lib/scroll-edges.js';
	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import { cn } from '#ui/lib/utils.js';
	import * as Dialog from '#ui/primitives-new/dialog/index.js';
	import * as Drawer from '#ui/primitives-new/drawer/index.js';

	/**
	 * The user-facing dialog: a centred dialog from `lg` up, a bottom sheet with a grabber
	 * below it. Title and footer stay put; only the body scrolls, and it shades whichever
	 * edge still has content behind it.
	 *
	 * A dialog with inputs keeps its actions in the body, not in `footer`: on a phone a
	 * pinned footer plus the keyboard leave nothing for the field.
	 */
	interface Props {
		open?: boolean;
		title?: string;
		description?: string;
		/** Keep the title accessible (screen readers) but hide it visually. */
		hideHeader?: boolean;
		/** Extra classes for the header wrapper, e.g. `text-center`. */
		headerClass?: string;
		/**
		 * The dialog's width on desktop: sm 400 · md 512 · lg 672 · xl 896. The sheet is
		 * always full width.
		 */
		size?: 'sm' | 'md' | 'lg' | 'xl';
		/** The dialog / sheet box itself. */
		class?: string;
		trigger?: Snippet;
		children: Snippet;
		footer?: Snippet;
		onOpenChange?: (open: boolean) => void;
	}

	const labels = getUiLabels();

	let {
		open = $bindable(false),
		title = '',
		description = '',
		hideHeader = false,
		headerClass = 'text-left',
		size = 'md',
		class: className = '',
		trigger,
		children,
		footer,
		onOpenChange
	}: Props = $props();

	const SIZES = {
		sm: 'sm:max-w-[25rem]',
		md: 'sm:max-w-lg',
		lg: 'sm:max-w-2xl',
		xl: 'sm:max-w-4xl'
	} as const;

	// Init-time constant: whether a ResponsiveModal/ResponsivePopover already wraps us.
	// On touch that ancestor is a drawer, and stacking a plain `Drawer.Root` inside one
	// breaks both — see responsive-layer.ts.
	const DrawerRoot = inResponsiveLayer() ? Drawer.NestedRoot : Drawer.Root;
	markResponsiveLayer();
</script>

<!-- The scrolling body with a soft shade at each edge that has more behind it. `sheet`
     only changes the gutters: 16px in the sheet, 24px in the dialog.
     `[&>*]:shrink-0`: flex items shrink by default, so a long child would be squashed to
     fit and overflow itself instead of the scroller. The paddings sit inside the scroller
     because its clip box would otherwise shear focus rings and the stamp's offset. -->
{#snippet body(sheet: boolean)}
	<div class="relative flex min-h-0 flex-1 flex-col">
		<div
			use:scrollEdges
			class={[
				'peer flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto [&>*]:shrink-0',
				sheet ? 'px-4 pb-4' : 'px-6 pb-6',
				// Under a visible header (and under the sheet's grabber) a sliver keeps focus
				// rings whole; a headerless dialog needs its own top gutter.
				hideHeader && !sheet ? 'pt-6' : 'pt-1'
			]}>
			{@render children()}
		</div>
		<div
			aria-hidden="true"
			class="from-ink/10 pointer-events-none absolute inset-x-0 top-0 h-3 bg-linear-to-b to-transparent opacity-0 transition-opacity duration-150 peer-data-[overflow-start]:opacity-100">
		</div>
		<div
			aria-hidden="true"
			class="from-ink/10 pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-linear-to-t to-transparent opacity-0 transition-opacity duration-150 peer-data-[overflow-end]:opacity-100">
		</div>
	</div>
{/snippet}

{#if layoutStore.touch}
	<!-- vaul rather than a bottom Sheet: the grabber + drag-to-dismiss is what makes this
	     read as a native sheet. `shouldScaleBackground` stays off — scaling needs a
	     `[vaul-drawer-wrapper]` element around the app, which this layout doesn't have. -->
	<DrawerRoot bind:open {onOpenChange} shouldScaleBackground={false}>
		{#if trigger}
			<Drawer.Trigger class="flex">
				{@render trigger()}
			</Drawer.Trigger>
		{/if}

		<!-- The `!`s are load-bearing: drawer-content sets its own max-height and radius
		     through data-attribute variants, which outrank plain utility classes.
		     Subtracting `--keyboard-inset` (keyboard-inset.ts) is what keeps a focused
		     field from turning the sheet full-screen: vaul lifts it above the keyboard
		     with an inline `bottom`, but also writes an inline `height` filling every
		     pixel left over. A max-height outranks that inline height, so this is the
		     only thing actually bounding the sheet while the keyboard is up. -->
		<Drawer.Content
			class={cn(
				'!max-h-[calc(90dvh-var(--keyboard-inset,0px))] !rounded-t-xl pb-safe text-sm',
				className
			)}>
			<!-- Extra top padding on top of drawer-header's `p-4`: the grabber sits right
			     above the title, and 16px leaves the sheet looking cramped against it. -->
			<Drawer.Header class={hideHeader ? 'sr-only' : cn('pt-5 pb-3', headerClass)}>
				<Drawer.Title>{title}</Drawer.Title>
				{#if description && !hideHeader}
					<Drawer.Description>{description}</Drawer.Description>
				{/if}
			</Drawer.Header>

			<!-- Only the body scrolls, so the grabber and footer stay put; vaul suspends
			     dragging until it's scrolled back to the top. -->
			{@render body(true)}

			{#if footer}
				<Drawer.Footer class="border-line gap-2 border-t pt-3">
					{@render footer()}
				</Drawer.Footer>
			{/if}

			<!-- Kept from the Sheet this replaced: drag-to-dismiss is a touch-only gesture,
			     and several callers have no cancel button of their own. -->
			<Drawer.Close class={OVERLAY_CLOSE_CLASS}>
				<XIcon />
				<span class="sr-only">{labels.close}</span>
			</Drawer.Close>
		</Drawer.Content>
	</DrawerRoot>
{:else}
	<Dialog.Root bind:open {onOpenChange}>
		{#if trigger}
			<Dialog.Trigger class="flex">
				{@render trigger()}
			</Dialog.Trigger>
		{/if}

		<!-- A flex column capped to the viewport instead of one scrolling box: the title and
		     the footer's actions are always on screen. -->
		<Dialog.Content
			class={cn(
				'flex max-h-[min(85vh,calc(100dvh-4rem))] flex-col gap-0 overflow-hidden p-0 text-sm',
				SIZES[size],
				className
			)}
			preventScroll>
			<Dialog.Header class={hideHeader ? 'sr-only' : cn('shrink-0 px-6 pt-6 pb-3', headerClass)}>
				<Dialog.Title>{title}</Dialog.Title>
				{#if description && !hideHeader}
					<Dialog.Description>{description}</Dialog.Description>
				{/if}
			</Dialog.Header>

			{@render body(false)}

			{#if footer}
				<Dialog.Footer class="border-line shrink-0 gap-2 border-t px-6 py-4">
					{@render footer()}
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{/if}
