<script lang="ts">
	import { ChevronLeft, ChevronRight, Download, RotateCcw, Share } from '@lucide/svelte';

	import { tick, untrack } from 'svelte';

	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import CaptionField from '#components/admin/instagram/CaptionField.svelte';
	import { findPostDesign } from '#components/admin/instagram/designs/index.js';
	import FillFromData from '#components/admin/instagram/FillFromData.svelte';
	import {
		emptyValues,
		type FillSource,
		POST_FORMATS,
		type PostFormat,
		type PostValues,
		slideNames
	} from '#components/admin/instagram/post-design.js';
	import {
		clearDraft,
		freshDraft,
		loadDraft,
		saveDraft
	} from '#components/admin/instagram/post-draft.js';
	import {
		canShareFiles,
		canvasToPng,
		saveBlob,
		zipFiles
	} from '#components/admin/instagram/post-export.js';
	import PostFields from '#components/admin/instagram/PostFields.svelte';
	import PostStage from '#components/admin/instagram/PostStage.svelte';
	import { monthLabel } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// One design's studio: its form, the post drawn live at its true size, and the PNGs (a
	// carousel's slides one by one or zipped). The draft stays in this browser (`post-draft`).
	const design = $derived(findPostDesign(page.params.design!)!);

	let draft = $state(untrack(() => loadDraft(design)));
	let slide = $state(0);
	let photosKept = $state(true);
	// Another design opened in the same component instance
	$effect.pre(() => {
		const d = design;
		untrack(() => {
			draft = loadDraft(d);
			slide = 0;
		});
	});

	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const snapshot = $state.snapshot(draft);
		const id = untrack(() => design.id);
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => (photosKept = saveDraft(id, snapshot)), 400);
		return () => clearTimeout(saveTimer);
	});

	const slides = $derived(slideNames(design, draft.values));
	const carousel = $derived(slides.length > 1);
	$effect(() => {
		if (slide > slides.length - 1) slide = slides.length - 1;
	});
	const size = $derived(POST_FORMATS[draft.format]);
	const FORMAT_ITEMS = $derived(
		design.formats.map((f) => ({ value: f, label: POST_FORMATS[f].label }))
	);

	// The PNG is drawn from an unscaled copy off screen, so the preview never flickers
	let exportSlide = $state<number | null>(null);
	let exportNode = $state<HTMLDivElement | null>(null);
	const ExportDesign = $derived(design.component);
	const render = async (index: number) => {
		exportSlide = index;
		await tick();
		try {
			return await canvasToPng(exportNode!, size.width, size.height);
		} finally {
			exportSlide = null;
		}
	};
	const filename = (index: number) =>
		`munchwerk-${design.id}${carousel ? `-${String(index + 1).padStart(2, '0')}` : ''}.png`;

	const downloadSlide = createAction(async (index: number) =>
		saveBlob(await render(index), filename(index))
	);
	const downloadAll = createAction(async () => {
		const files = [];
		for (let i = 0; i < slides.length; i++)
			files.push({ name: filename(i), blob: await render(i) });
		saveBlob(await zipFiles(files), `munchwerk-${design.id}.zip`);
	});
	// The share sheet takes every slide at once: on a phone that is Instagram's own picker
	const share = createAction(async () => {
		const files = [];
		for (let i = 0; i < slides.length; i++)
			files.push(new File([await render(i)], filename(i), { type: 'image/png' }));
		try {
			await navigator.share({ files });
		} catch (e) {
			if ((e as Error).name !== 'AbortError') throw e;
		}
	});
	const shareable = canShareFiles();
	const busy = $derived(downloadSlide.executing || downloadAll.executing || share.executing);

	const reset = () => {
		const before = $state.snapshot(draft);
		clearDraft(design.id);
		draft = freshDraft(design);
		slide = 0;
		return before;
	};
	const resetAction = createAction(async () => reset(), {
		successNotification: (before) => ({
			title: 'Back to the sample content',
			action: { label: 'Undo', onClick: () => (draft = before) }
		})
	});

	// A fill replaces what the data knows and keeps the rest: a row's photo and credit stay
	// with the place of the same name, so filling again after adding photos loses nothing
	const applyFill = (result: { values: PostValues; caption: string }, source: FillSource) => {
		const before = $state.snapshot(draft);
		const values: PostValues = { ...before.values, ...result.values };
		for (const field of design.fields) {
			const rows = result.values[field.key];
			if (field.type !== 'list' || !Array.isArray(rows)) continue;
			const old = (before.values[field.key] as PostValues[] | undefined) ?? [];
			values[field.key] = (rows as PostValues[]).map((row) => ({
				...emptyValues(field.fields),
				...old.find((o) => o.name && o.name === row.name),
				...row
			}));
		}
		draft.values = values;
		draft.caption = result.caption;
		slide = 0;
		notificationManager.addNotification({
			title: `Filled from ${source.cityName}, ${monthLabel(source.month)}`,
			success: true,
			action: { label: 'Undo', onClick: () => (draft = before) }
		});
	};

	// Editing a list row turns a carousel to that row's slide (rows follow the cover)
	const followRow = (_key: string, index: number) => {
		if (carousel) slide = Math.min(index + 1, slides.length - 1);
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (
			!carousel ||
			(e.target as HTMLElement).closest(
				'input, textarea, [contenteditable], [role="listbox"]'
			)
		)
			return;
		if (e.key === 'ArrowLeft') slide = Math.max(0, slide - 1);
		if (e.key === 'ArrowRight') slide = Math.min(slides.length - 1, slide + 1);
	}} />

<AdminPageHeader title={design.name} description={design.description}>
	{#snippet rightTitle()}
		{#if design.formats.length > 1}
			<div class="w-40">
				<Select
					items={FORMAT_ITEMS}
					value={draft.format}
					aria-label="Format"
					size="sm"
					onValueChange={(v) => (draft.format = v as PostFormat)} />
			</div>
		{/if}
		<Button size="sm" variant="ghost" icon={RotateCcw} onclick={() => resetAction.execute()}
			>Reset</Button>
		{#if shareable}
			<Button
				size="sm"
				variant="outline"
				icon={Share}
				loading={share.executing}
				disabled={busy}
				onclick={() => share.execute()}>Share</Button>
		{/if}
		{#if carousel}
			<Button
				size="sm"
				icon={Download}
				loading={downloadAll.executing}
				disabled={busy}
				onclick={() => downloadAll.execute()}>
				Download all ({slides.length})
			</Button>
		{:else}
			<Button
				size="sm"
				icon={Download}
				loading={downloadSlide.executing}
				disabled={busy}
				onclick={() => downloadSlide.execute(0)}>
				Download PNG
			</Button>
		{/if}
	{/snippet}
</AdminPageHeader>

<div
	class="grid min-w-0 grid-cols-1 items-start gap-5 pb-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
	<div class="flex min-w-0 flex-col gap-5">
		{#if design.fills?.length}
			<FillFromData {design} onfill={applyFill} />
		{/if}
		<AdminPanel title="Content">
			<div class="flex flex-col gap-4">
				{#if !photosKept}
					<Notice
						tone="warning"
						text="The photos are too large to keep in this browser: they'll be gone after a reload. Download first." />
				{/if}
				<PostFields
					fields={design.fields}
					bind:values={draft.values}
					onrowfocus={followRow} />
			</div>
		</AdminPanel>
		<AdminPanel title="Caption">
			<CaptionField bind:value={draft.caption} />
		</AdminPanel>
	</div>

	<div class="flex min-w-0 flex-col gap-3 lg:sticky lg:top-(--sticky-top)">
		{#if carousel}
			<div class="flex items-center gap-2">
				<IconButton
					variant="outline"
					icon={ChevronLeft}
					label="Previous slide"
					disabled={slide === 0}
					onclick={() => (slide -= 1)} />
				<div class="scroll-fade-x no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
					{#each slides as name, i (i)}
						<button
							type="button"
							class="chip shrink-0"
							aria-pressed={slide === i}
							onclick={() => (slide = i)}>{name}</button>
					{/each}
				</div>
				<IconButton
					variant="outline"
					icon={ChevronRight}
					label="Next slide"
					disabled={slide === slides.length - 1}
					onclick={() => (slide += 1)} />
			</div>
		{/if}
		<div class="bg-wash border-line flex justify-center rounded-md border p-4 lg:p-6">
			<PostStage
				{design}
				values={draft.values}
				format={draft.format}
				{slide}
				maxHeight="calc(100vh - 19rem)"
				class="shadow-[0_2px_0_var(--line)]" />
		</div>
		<div class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
			<span
				>{size.width} × {size.height} PNG{carousel
					? ` · slide ${slide + 1} of ${slides.length}`
					: ''}</span>
			{#if carousel}
				<Button
					size="sm"
					variant="outline"
					icon={Download}
					class="ml-auto"
					loading={downloadSlide.executing}
					disabled={busy}
					onclick={() => downloadSlide.execute(slide)}>
					This slide
				</Button>
			{/if}
		</div>
	</div>
</div>

<!-- Off screen, unscaled: what `render` turns into the PNG -->
<div class="pointer-events-none fixed top-0 left-[-20000px]" aria-hidden="true" inert>
	{#if exportSlide !== null}
		<div bind:this={exportNode} style={`width: ${size.width}px; height: ${size.height}px;`}>
			<ExportDesign {...draft.values} format={draft.format} slide={exportSlide} />
		</div>
	{/if}
</div>
