<script lang="ts">
	import type { PostCanvasProps, PostTheme } from '../post-design.js';

	import Canvas from './parts/Canvas.svelte';
	import { fitSize } from './parts/palette.js';
	import Stamp from './parts/Stamp.svelte';
	import Wordmark from './parts/Wordmark.svelte';

	// A ranked list in one image (Heat Check, Rising): the stamp, the title, the period, then
	// the rows on a paper card with a bar each, the story's row in acid with an ink outline.
	// Square fits 5 rows (its method line is left to the caption), portrait 8, a story 10.
	// The card carries the bite, the stamp the tilt.
	interface Item {
		name: string;
		meta: string;
		value: number;
	}
	interface Props extends PostCanvasProps {
		theme: PostTheme;
		label: string;
		title: string;
		period: string;
		items: Item[];
		method: string;
		handle: string;
	}

	let { format, theme, label, title, period, items, method, handle }: Props = $props();

	const square = $derived(format === 'square');
	const ROWS = { square: 5, portrait: 8, story: 10 };
	const rows = $derived(items.slice(0, ROWS[format]));
	const max = $derived(Math.max(1, ...rows.map((r) => Number(r.value) || 0)));
	const titleSize = $derived(
		fitSize(title, [
			[24, square ? 80 : 96],
			[44, square ? 72 : 84],
			[999, square ? 60 : 68]
		])
	);
	const rowSize = $derived(square ? 38 : 42);
</script>

<Canvas {format} {theme}>
	{#if label}
		<Stamp tilt="left" class="mb-[36px]">{label}</Stamp>
	{/if}
	<h1
		class="font-display m-0 font-extrabold"
		style={`font-size: ${titleSize}px; line-height: 0.92; letter-spacing: -0.03em; font-variation-settings: 'opsz' 96; text-wrap: balance;`}>
		{title}
	</h1>
	{#if period}
		<div class="font-bold text-(--c-muted)" style="font-size: 40px; margin-top: 16px;">
			{period}
		</div>
	{/if}

	<div class="relative mt-[48px] flex min-h-0 flex-1">
		<div
			class="absolute inset-0 bg-(--c-shadow) bite"
			style="translate: 16px 16px; --bite: 52px;">
		</div>
		<div
			class="bite relative flex flex-1 flex-col border-[6px] border-(--c-ink) bg-(--c-paper)"
			style="padding: 12px 36px; --bite: 52px;">
			{#each rows as row, i (i)}
				<div
					class={[
						'flex flex-1 items-center',
						i < rows.length - 1 && 'border-b-2 border-(--c-hairline)'
					]}>
					<div
						class="font-display shrink-0 font-extrabold"
						style={`width: ${rowSize * 1.75}px; font-size: ${rowSize * 1.15}px; letter-spacing: -0.05em;`}>
						{String(i + 1).padStart(2, '0')}
					</div>
					<div class="flex min-w-0 flex-1 flex-col">
						<div
							class="font-display truncate font-extrabold"
							style={`font-size: ${rowSize}px; line-height: 1.1;`}>
							{row.name}
						</div>
						<div class="mt-[10px] flex">
							<div
								class={[
									'h-[14px]',
									i === 0
										? 'bg-acid outline-[3px] outline-[#1f1724]'
										: 'bg-(--c-bar)'
								]}
								style={`width: ${Math.max(3, ((Number(row.value) || 0) / max) * 100)}%;`}>
							</div>
						</div>
					</div>
					{#if row.meta}
						<!-- The first row's count steps clear of the card's bite -->
						<div
							class="ml-[24px] shrink-0 font-bold text-(--c-muted)"
							style={`font-size: 32px; margin-right: ${i === 0 ? 48 : 0}px;`}>
							{row.meta}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="mt-[44px] flex flex-col" style="gap: 24px;">
		<!-- A square has no room for it: the caption carries the method there -->
		{#if method && !square}
			<p class="m-0 text-(--c-muted)" style="font-size: 32px; line-height: 1.3;">{method}</p>
		{/if}
		<Wordmark {handle} />
	</div>
</Canvas>
