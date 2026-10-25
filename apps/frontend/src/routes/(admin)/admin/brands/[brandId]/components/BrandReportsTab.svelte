<script lang="ts">
	import { FileText, Plus, Printer, RefreshCw } from '@lucide/svelte';
	import type {
		AdminBrandOutputDto,
		AdminReportConfigOutputDto,
		AdminReportListItemOutputDto,
		AdminReportTemplateOutputDto
	} from 'client';

	import { onMount } from 'svelte';

	import { goto } from '$app/navigation';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { downloadLeaveBehindPdf } from '#components/admin/outreach/report-pdf.js';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { sectionsOutline } from '#lib/report-sections.js';
	import type {
		Column,
		PaginatedDataTableAction
	} from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The brand's report configurations (each a report it gets every month while active, its own
	// copy of a template's sections) and its monthly reports in the city (or across its cities).
	// A configuration's "Build" makes its report of the month picked above, as "Build report"
	// there does for the configuration picked from its menu; Rebuild after fixing a mention or a
	// competitor. "Print leave-behind" is the A5 page to take on a visit: the cover, three
	// findings and a QR code to the share link.
	interface Props {
		brand: AdminBrandOutputDto;
		cityId?: string;
		month: string;
		// Loaded by the brand page, which builds from them too; null while loading
		configs: AdminReportConfigOutputDto[] | null;
		onBuild: (config: AdminReportConfigOutputDto) => void;
		building: boolean;
	}

	let { brand, cityId, month, configs, onBuild, building }: Props = $props();

	const acrossCities = $derived(brand.reportScope === 'all');

	// The templates a new configuration can copy
	let templates = $state<AdminReportTemplateOutputDto[]>([]);
	onMount(() => {
		api.admin
			.listReportTemplates()
			.then((list) => (templates = list))
			.catch(() => (templates = []));
	});
	const defaultTemplate = $derived(templates.find((t) => t.isDefault));
	const active = (c: AdminReportConfigOutputDto) => (c.status as string) === 'active';
	const CUSTOM = 'custom';
	const addItems = $derived([
		...templates.map((t) => ({ value: t.id, label: `Copy of ${t.name}` })),
		{ value: CUSTOM, label: 'Custom (every section, to trim)' }
	]);
	let adding = $state('');
	const addAction = createAction(
		(choice: string) =>
			api.admin.createBrandReportConfig(
				brand.id,
				choice === CUSTOM ? {} : { templateId: choice }
			),
		{
			onSuccess: (config) => goto(`/admin/brands/${brand.id}/report-configs/${config.id}`),
			onError: () => (adding = '')
		}
	);

	const COLUMNS: Column<AdminReportListItemOutputDto>[] = [
		{
			type: 'link',
			name: 'Month',
			href: (row) => `/admin/reports/${row.id}`,
			value: (row) => monthLabel(row.month)
		},
		{ type: 'value', name: 'Report', truncate: 28, value: (row) => row.name },
		{ type: 'value', name: 'Headline', truncate: 64, value: (row) => row.headline },
		{ type: 'count', name: 'Posts', value: (row) => row.postCount },
		{ type: 'count', name: 'Reviews', value: (row) => row.reviewCount },
		{ type: 'date', name: 'Built', relative: true, value: (row) => row.updatedAt },
		{ type: 'date', name: 'Sent', format: 'date', value: (row) => row.sentAt }
	];

	let version = $state(0);
	const rebuildAction = createAction(
		(row: AdminReportListItemOutputDto) =>
			api.admin.buildReport({
				brandId: brand.id,
				cityId: row.city?.id,
				month: row.month,
				// Its configuration's alone; a default report rebuilds as the brand's reports now are
				...(row.config && { configId: row.config.id })
			}),
		{
			onSuccess: () => version++,
			successNotification: (_, [row]) => ({
				title: 'Report rebuilt',
				text: `${row.name}, ${monthLabel(row.month)}`
			})
		}
	);
	const leaveBehindAction = createAction(
		(row: AdminReportListItemOutputDto) => downloadLeaveBehindPdf(row, brand.name),
		{
			successNotification: {
				title: 'Leave-behind ready',
				text: 'An A5 page in your downloads: print it and take it along'
			}
		}
	);
	const ACTIONS: PaginatedDataTableAction<AdminReportListItemOutputDto>[] = [
		{
			icon: Printer,
			label: 'Print leave-behind',
			onClick: (row) => {
				leaveBehindAction.execute(row);
			}
		},
		{
			icon: RefreshCw,
			label: 'Rebuild report',
			onClick: (row) => {
				rebuildAction.execute(row);
			}
		}
	];
</script>

<div class="mb-5 xl:max-w-4xl">
	<AdminPanel title="Report configurations" note={configs?.length}>
		{#snippet action()}
			<a href="/admin/reports/templates" class="text-beet text-xs">Templates</a>
		{/snippet}
		{#if configs === null}
			<SkeletonRows count={2} />
		{:else}
			{#if configs.length}
				<ul class="m-0 flex list-none flex-col gap-2 p-0">
					{#each configs as config (config.id)}
						<li
							class="bg-paper border-line flex flex-wrap items-start justify-between gap-3 rounded-md border px-4 py-3">
							<div class="min-w-0 flex-1">
								<p class="m-0 flex flex-wrap items-center gap-2">
									<a
										href={`/admin/brands/${brand.id}/report-configs/${config.id}`}
										class="text-ink text-sm font-semibold no-underline hover:underline"
										>{config.name}</a>
									{#if !active(config)}<Badge variant="quiet">Inactive</Badge
										>{/if}
									<span class="text-muted-foreground text-xs"
										>{config.template
											? `from ${config.template.name}`
											: 'Custom'}</span>
								</p>
								<p class="text-muted-foreground m-0 mt-0.5 text-xs">
									{config.sections.length} sections: {sectionsOutline(
										config.sections
									)}
								</p>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									href={`/admin/brands/${brand.id}/report-configs/${config.id}`}
									>Edit</Button>
								<Button
									size="sm"
									icon={FileText}
									disabled={building}
									onclick={() => onBuild(config)}
									>Build {monthLabel(month)}</Button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				{#if !configs.some(active)}
					{configs.length ? 'None is active, so' : 'None yet, so'}
					{brand.name} gets the {defaultTemplate
						? `default template (${defaultTemplate.name})`
						: 'full report'}
					every month.
				{:else}
					Each active configuration is built into a report of its own every month and
					mailed on its own to a subscriber.
				{/if}
			</p>
			<div class="mt-3 flex items-center gap-2">
				<div class="w-72">
					<Select
						items={addItems}
						bind:value={adding}
						placeholder="Add a configuration"
						aria-label="Add a configuration"
						onValueChange={(v) => v && addAction.execute(v)} />
				</div>
				{#if addAction.executing}<Plus
						class="text-muted-foreground size-4 animate-pulse" />{/if}
			</div>
		{/if}
	</AdminPanel>
</div>

<PaginatedDataTable
	filters={{ brandId: brand.id, ...(acrossCities || !cityId ? {} : { cityId }) }}
	api={api.admin.listReports}
	noun="reports"
	columns={COLUMNS}
	actions={ACTIONS}
	key={version}
	emptyDescription="Pick a month above and build a configuration’s report."
	rowHref={(row) => `/admin/reports/${row.id}`} />
