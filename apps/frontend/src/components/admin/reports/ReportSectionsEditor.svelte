<script lang="ts">
	import { ArrowDown, ArrowUp, GripVertical, X } from '@lucide/svelte';

	import { onMount, type Snippet } from 'svelte';

	import {
		type AdminReportListItemOutputDto,
		type AdminReportOutputDto,
		ListReportsParamsSortEnum
	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import {
		CoverKpi,
		fromSectionsDraft,
		KPI_LABELS,
		MAX_ARTICLES_SHOWN,
		MAX_DISHES_SHOWN,
		MAX_POSTS_SHOWN,
		newSection,
		PART_LABELS,
		PlacePart,
		PLATFORM_NAMES,
		PostPlatform,
		SECTION_INFO,
		SectionKind,
		type SectionsDraft
	} from '#lib/report-sections.js';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';
	import ReportView from '#views/report/ReportView.svelte';

	// A report layout being edited (a template, or a brand's configuration): its sections in
	// order with their settings, and a built report laid out as the draft. The cover is always
	// first and the appendix last, so only the sections between them move. `details` goes above
	// the sections (name and the like); `brandId` previews that brand's reports only. On desktop
	// it fills the height its page gives it (`xl:flex-1` in a full-height column) and the two
	// columns scroll on their own, the preview's picker staying put.
	interface Props {
		draft: SectionsDraft;
		brandId?: string;
		details?: Snippet;
	}

	let { draft = $bindable(), brandId, details }: Props = $props();

	const sections = $derived(fromSectionsDraft(draft));

	// What can still be added: every kind not in the draft, the cover and appendix aside
	const addable = $derived(
		Object.values(SectionKind)
			.filter((k) => k !== SectionKind.Cover && k !== SectionKind.Appendix)
			.filter((k) => !draft.middle.some((s) => s.kind === k))
			.map((k) => ({ value: k, label: SECTION_INFO[k].label }))
	);
	let adding = $state<string>('');
	const add = (kind: string) => {
		if (!kind) return;
		draft.middle.push(newSection(kind as SectionKind));
		adding = '';
	};
	const move = (from: number, to: number) => {
		if (to < 0 || to >= draft.middle.length || from === to) return;
		const [section] = draft.middle.splice(from, 1);
		draft.middle.splice(to, 0, section);
	};
	const remove = (i: number) => draft.middle.splice(i, 1);

	// Drag and drop between the rows; the arrows do the same from the keyboard
	let dragging = $state<number | null>(null);
	let over = $state<number | null>(null);
	const drop = (to: number) => {
		if (dragging !== null) move(dragging, to);
		dragging = null;
		over = null;
	};

	// A list setting in its canonical order, with one value switched on or off
	const toggled = <T extends string>(all: T[], picked: T[] | undefined, value: T, on: boolean) =>
		all.filter((v) => (v === value ? on : (picked ?? []).includes(v)));
	const limit = (value: string, max: number, fallback: number) => {
		const n = Math.round(Number(value));
		return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : fallback;
	};

	// The preview: a built report, laid out as the draft says. Its findings were written for the
	// sections it was built with.
	let recent = $state<AdminReportListItemOutputDto[] | null>(null);
	let previewId = $state<string>('');
	let preview = $state<AdminReportOutputDto | null>(null);
	let previewError = $state(false);
	onMount(() => {
		api.admin
			.listReports({
				page: 1,
				size: 30,
				sort: ListReportsParamsSortEnum.UpdatedAtDesc,
				...(brandId && { brandId })
			})
			.then((res) => {
				recent = res.items;
				previewId = res.items[0]?.id ?? '';
			})
			.catch(() => (recent = []));
	});
	$effect(() => {
		const id = previewId;
		if (!id) return;
		preview = null;
		previewError = false;
		api.admin
			.getReport(id)
			.then((r) => {
				if (id === previewId) preview = r;
			})
			.catch(() => (previewError = true));
	});
	const reportItems = $derived(
		(recent ?? []).map((r) => ({
			value: r.id,
			label: [
				brandId ? r.name : r.brand.name,
				r.city?.name ?? 'All cities',
				monthLabel(r.month)
			].join(' · ')
		}))
	);
</script>

<div
	class="grid grid-cols-1 items-start gap-5 pb-12 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:items-stretch xl:pb-0">
	<div class="flex min-w-0 flex-col gap-5 xl:min-h-0 xl:overflow-y-auto xl:pr-1 xl:pb-6">
		{@render details?.()}

		<AdminPanel title="Sections" note={sections.length}>
			<ol class="m-0 flex list-none flex-col gap-2 p-0">
				<!-- The cover: always first -->
				<li class="bg-wash/50 border-line rounded-md border px-3 py-2.5">
					<p class="m-0 text-sm font-semibold">{SECTION_INFO.cover.label}</p>
					<p class="text-muted-foreground m-0 text-xs">
						{SECTION_INFO.cover.description}
					</p>
					<fieldset class="m-0 mt-2 border-0 p-0">
						<legend class="text-muted-foreground mb-1 text-[11px]">Figures</legend>
						<div class="grid grid-cols-2 gap-x-3 gap-y-1">
							{#each Object.values(CoverKpi) as kpi (kpi)}
								<Checkbox
									checked={draft.cover.kpis?.includes(kpi)}
									disabled={draft.cover.kpis?.length === 1 &&
										draft.cover.kpis.includes(kpi)}
									onCheckedChange={(on: boolean) =>
										(draft.cover.kpis = toggled(
											Object.values(CoverKpi),
											draft.cover.kpis,
											kpi,
											on
										))}>{KPI_LABELS[kpi]}</Checkbox>
							{/each}
						</div>
					</fieldset>
				</li>

				{#each draft.middle as section, i (section.kind)}
					<li
						class={[
							'bg-paper border-line rounded-md border px-3 py-2.5',
							over === i && dragging !== i && 'border-ink border-dashed',
							dragging === i && 'opacity-50'
						]}
						draggable="true"
						ondragstart={(e) => {
							dragging = i;
							e.dataTransfer?.setData('text/plain', section.kind);
						}}
						ondragover={(e) => {
							e.preventDefault();
							over = i;
						}}
						ondragleave={() => over === i && (over = null)}
						ondrop={(e) => {
							e.preventDefault();
							drop(i);
						}}
						ondragend={() => {
							dragging = null;
							over = null;
						}}>
						<div class="flex items-start gap-2">
							<GripVertical
								class="text-muted-foreground mt-0.5 size-4 shrink-0 cursor-grab" />
							<div class="min-w-0 flex-1">
								<p class="m-0 text-sm font-semibold">
									{SECTION_INFO[section.kind].label}
								</p>
								<p class="text-muted-foreground m-0 text-xs">
									{SECTION_INFO[section.kind].description}
								</p>
							</div>
							<div class="flex shrink-0 items-center">
								<IconButton
									variant="ghost"
									sm
									icon={ArrowUp}
									label="Move up"
									disabled={i === 0}
									onclick={() => move(i, i - 1)} />
								<IconButton
									variant="ghost"
									sm
									icon={ArrowDown}
									label="Move down"
									disabled={i === draft.middle.length - 1}
									onclick={() => move(i, i + 1)} />
								<IconButton
									variant="ghost"
									sm
									icon={X}
									label="Remove"
									onclick={() => remove(i)} />
							</div>
						</div>

						{#if section.kind === SectionKind.Posts}
							<div class="mt-2 ml-6 flex flex-col gap-2">
								<fieldset class="m-0 border-0 p-0">
									<legend class="text-muted-foreground mb-1 text-[11px]">
										Platforms (none picked: all of them)
									</legend>
									<div class="flex flex-wrap gap-x-4 gap-y-1">
										{#each Object.values(PostPlatform) as platform (platform)}
											<Checkbox
												checked={section.platforms?.includes(platform)}
												onCheckedChange={(on: boolean) =>
													(section.platforms = toggled(
														Object.values(PostPlatform),
														section.platforms,
														platform,
														on
													))}>{PLATFORM_NAMES[platform]}</Checkbox>
										{/each}
									</div>
								</fieldset>
								<label class="flex items-center gap-2 text-xs">
									<span class="text-muted-foreground">Top posts shown</span>
									<Input
										type="number"
										class="h-8 w-20"
										min={1}
										max={MAX_POSTS_SHOWN}
										value={section.limit}
										onchange={(e: Event) =>
											(section.limit = limit(
												(e.target as HTMLInputElement).value,
												MAX_POSTS_SHOWN,
												6
											))} />
								</label>
							</div>
						{:else if section.kind === SectionKind.Creators}
							<div class="mt-2 ml-6">
								<Checkbox
									checked={section.nearby}
									onCheckedChange={(on: boolean) => (section.nearby = on)}
									>Also the creators who covered the neighbours</Checkbox>
							</div>
						{:else if section.kind === SectionKind.Media}
							<label class="mt-2 ml-6 flex items-center gap-2 text-xs">
								<span class="text-muted-foreground">Articles shown</span>
								<Input
									type="number"
									class="h-8 w-20"
									min={1}
									max={MAX_ARTICLES_SHOWN}
									value={section.limit}
									onchange={(e: Event) =>
										(section.limit = limit(
											(e.target as HTMLInputElement).value,
											MAX_ARTICLES_SHOWN,
											6
										))} />
							</label>
						{:else if section.kind === SectionKind.Dishes}
							<label class="mt-2 ml-6 flex items-center gap-2 text-xs">
								<span class="text-muted-foreground">Dishes listed</span>
								<Input
									type="number"
									class="h-8 w-20"
									min={1}
									max={MAX_DISHES_SHOWN}
									value={section.limit}
									onchange={(e: Event) =>
										(section.limit = limit(
											(e.target as HTMLInputElement).value,
											MAX_DISHES_SHOWN,
											12
										))} />
							</label>
						{:else if section.kind === SectionKind.Places}
							<fieldset class="m-0 mt-2 ml-6 border-0 p-0">
								<legend class="text-muted-foreground mb-1 text-[11px]"
									>Each place shows</legend>
								<div class="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
									{#each Object.values(PlacePart) as part (part)}
										<Checkbox
											checked={section.parts?.includes(part)}
											disabled={section.parts?.length === 1 &&
												section.parts.includes(part)}
											onCheckedChange={(on: boolean) =>
												(section.parts = toggled(
													Object.values(PlacePart),
													section.parts,
													part,
													on
												))}>{PART_LABELS[part]}</Checkbox>
									{/each}
								</div>
							</fieldset>
						{/if}
					</li>
				{/each}

				<!-- The appendix: always last when kept -->
				<li class="bg-wash/50 border-line rounded-md border px-3 py-2.5">
					<Checkbox bind:checked={draft.appendix}>{SECTION_INFO.appendix.label}</Checkbox>
					<p class="text-muted-foreground m-0 ml-6 text-xs">
						{SECTION_INFO.appendix.description}
					</p>
				</li>
			</ol>

			{#if addable.length}
				<div class="mt-3 flex items-center gap-2">
					<div class="min-w-0 flex-1">
						<Select
							items={addable}
							bind:value={adding}
							placeholder="Add a section"
							aria-label="Add a section"
							onValueChange={(v) => add(v)} />
					</div>
				</div>
			{/if}
			<p class="text-muted-foreground m-0 mt-3 text-xs">
				A section with nothing to show for a brand that month (no competitors, no press)
				drops out of its report. Drag the rows or use the arrows to reorder.
			</p>
		</AdminPanel>
	</div>

	<div class="flex min-w-0 flex-col gap-3 xl:min-h-0">
		<div class="flex flex-wrap items-center gap-3">
			<span class="text-sm font-semibold">Preview on</span>
			<div class="w-full max-w-sm">
				{#if recent && recent.length}
					<Select
						items={reportItems}
						bind:value={previewId}
						aria-label="Report to preview" />
				{/if}
			</div>
		</div>
		<p class="text-muted-foreground m-0 text-xs">
			A built report laid out as this draft. Its findings and actions were written for the
			sections it was built with; a report built from this one gets its own.
		</p>
		<!-- Scrolls on its own on desktop; the sheet keeps its frame inside the scroller -->
		<div class="min-w-0 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 xl:pb-6">
			<div
				class="bg-paper border-line shadow-sticker min-w-0 rounded-md border px-5 py-8 sm:px-10 sm:py-10">
				{#if recent && !recent.length}
					<p class="text-muted-foreground m-0 text-sm">
						No report is built yet{brandId ? ' for this brand' : ''} to preview on.
					</p>
				{:else if previewError}
					<p class="text-muted-foreground m-0 text-sm">
						That report could not be loaded.
					</p>
				{:else if preview}
					<ReportView
						report={{ data: preview.data, highlights: preview.highlights, sections }} />
				{:else}
					<SkeletonRows count={8} />
				{/if}
			</div>
		</div>
	</div>
</div>
