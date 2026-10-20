<script lang="ts">
	import * as Tooltip from '#ui/primitives-new/tooltip/index.js';

	/**
	 * A hover/focus hint for a glyph or a clipped value. Pointer and keyboard only — touch
	 * has no hover — so it may repeat a fact, never be the only place it lives.
	 *
	 * The trigger is a `<span>` around the children, not a button: wrapping an `IconButton`
	 * or a link stays valid markup, and the hint follows that control's own focus.
	 */
	interface Props {
		text?: string | undefined;
		delayDuration?: number;
		side?: 'bottom' | 'top' | 'right' | 'left' | undefined;
		/**
		 * For content that cannot take focus itself (a bare icon, a clipped cell): makes the
		 * wrapper a tab stop so keyboard users reach the hint too.
		 */
		focusable?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		text = undefined,
		delayDuration = 300,
		side = 'bottom',
		focusable = false,
		class: className = '',
		children
	}: Props = $props();
</script>

{#if text}
	<Tooltip.Provider>
		<Tooltip.Root {delayDuration}>
			<Tooltip.Trigger tabindex={focusable ? 0 : -1}>
				{#snippet child({ props })}
					<!-- `focus` does not bubble, so the trigger's own handlers are also hooked
					     to focusin/out: focusing the control inside opens the hint. -->
					<span
						{...props}
						class={['inline-flex items-center', focusable ? 'rounded-sm' : '', className]}
						onfocusin={props.onfocus as never}
						onfocusout={props.onblur as never}>
						{@render children?.()}
					</span>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content {side} sideOffset={6} class="max-w-64">
				<p>{text}</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else}
	{@render children?.()}
{/if}
