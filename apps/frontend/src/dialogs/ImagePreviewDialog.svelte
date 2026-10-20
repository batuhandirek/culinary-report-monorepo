<script lang="ts">
	import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';

	import Icon from '#ui/components/Icon.svelte';
	import * as Dialog from '#ui/primitives-new/dialog/index.js';

	/**
	 * A photo at full size over the page. With `images` it is a lightbox: arrows, ← →,
	 * a swipe on touch, and a counter. One photo or many, there is always a close key —
	 * on a phone the picture covers everything else that could dismiss it.
	 */
	interface Props {
		active?: boolean;
		/** The photo to show. With `images`, `images[index]` is shown instead. */
		image?: string;
		/** A set to page through. */
		images?: string[];
		/** Which of `images` is up; follows the arrows. */
		index?: number;
		/** What the photo shows, for screen readers. */
		alt?: string;
		noBlur?: boolean;
		blurredImage?: string;
		children?: import('svelte').Snippet;
		/** Classes for the trigger button (it is a `<button>`: pass it no buttons). */
		triggerClass?: string;
	}

	let {
		active = $bindable(false),
		image,
		images,
		index = $bindable(0),
		alt = '',
		noBlur,
		blurredImage,
		children,
		triggerClass = 'flex cursor-pointer'
	}: Props = $props();

	const count = $derived(images?.length ?? 0);
	const current = $derived(count > 0 ? images![Math.min(index, count - 1)] : image);

	const step = (by: number) => {
		if (count < 2) return;
		index = (index + by + count) % count;
	};

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'ArrowLeft') step(-1);
	}

	// A horizontal flick pages; anything mostly vertical is left alone.
	let touchX = 0;
	let touchY = 0;
	function ontouchstart(e: TouchEvent) {
		touchX = e.touches[0].clientX;
		touchY = e.touches[0].clientY;
	}
	function ontouchend(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchX;
		const dy = e.changedTouches[0].clientY - touchY;
		if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
	}

	const KEY =
		'bg-paper text-ink border-line hover:bg-tint focus-visible:ring-ring/50 absolute z-10 grid size-11 place-items-center rounded-full border outline-none transition-colors focus-visible:ring-[3px]';
</script>

<Dialog.Root bind:open={active}>
	{#if children}
		<Dialog.Trigger class={triggerClass}>
			{@render children?.()}
		</Dialog.Trigger>
	{/if}

	<Dialog.Content
		class="bg-secondary flex h-[92dvh] !max-h-[92dvh] w-[94vw] !max-w-[94vw] items-center justify-center overflow-hidden border-none p-0 text-sm lg:h-[90dvh] lg:w-[90vw]"
		preventScroll
		escapeKeydownBehavior="close"
		interactOutsideBehavior="close"
		showCloseButton={false}
		{onkeydown}
		{ontouchstart}
		{ontouchend}>
		<Dialog.Title class="sr-only">{alt || 'Fotoğraf'}</Dialog.Title>
		{#if !noBlur && current}
			<img
				src={count > 0 ? current : (blurredImage ?? current)}
				alt=""
				aria-hidden="true"
				class="absolute left-0 top-0 size-full scale-110 object-cover opacity-60 blur-2xl" />
		{/if}
		{#if current}
			{#key current}
				<img
					src={current}
					{alt}
					class="animate-in fade-in-0 relative max-h-full max-w-full object-contain duration-150 motion-reduce:animate-none" />
			{/key}
		{/if}

		<Dialog.Close class={`${KEY} right-3 top-3`} aria-label="Kapat">
			<Icon icon={X} size={18} />
		</Dialog.Close>

		{#if count > 1}
			<button
				type="button"
				class={`${KEY} left-3 top-1/2 -translate-y-1/2`}
				aria-label="Önceki fotoğraf"
				onclick={() => step(-1)}>
				<Icon icon={ChevronLeft} size={18} />
			</button>
			<button
				type="button"
				class={`${KEY} right-3 top-1/2 -translate-y-1/2`}
				aria-label="Sonraki fotoğraf"
				onclick={() => step(1)}>
				<Icon icon={ChevronRight} size={18} />
			</button>
			<span
				class="bg-ink text-acid font-term absolute bottom-3 left-1/2 -translate-x-1/2 px-2 pb-px pt-0.5 text-base leading-none"
				aria-live="polite">
				{String(Math.min(index, count - 1) + 1).padStart(2, '0')}/{String(count).padStart(
					2,
					'0'
				)}
			</span>
		{/if}
	</Dialog.Content>
</Dialog.Root>
