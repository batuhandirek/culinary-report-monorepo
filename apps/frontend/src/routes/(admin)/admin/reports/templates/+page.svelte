<script lang="ts">
	import { Plus, Star } from '@lucide/svelte';

	import { goto, invalidate } from '$app/navigation';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import { api } from '#lib/api.js';
	import { sectionsOutline } from '#lib/report-sections.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// Ready-made report layouts. A brand's Reports tab copies one into a configuration of its own
	// and edits it there; a brand without an active configuration gets the default template.
	let { data } = $props();
	const templates = $derived(data.templates);

	const createAction_ = createAction(
		() => {
			const taken = new Set(templates.map((t) => t.name));
			let name = 'New template';
			for (let n = 2; taken.has(name); n++) name = `New template ${n}`;
			return api.admin.createReportTemplate({ name });
		},
		{ onSuccess: (template) => goto(`/admin/reports/templates/${template.id}`) }
	);

	const defaultAction = createAction((id: string) => api.admin.setDefaultReportTemplate(id), {
		onSuccess: () => invalidate('report-templates:list'),
		successNotification: (template) => ({
			title: `${template.name} is the default`,
			text: 'Brands without an active configuration get it from their next report on.'
		})
	});

	const copies = (n: number) => `${n} ${n === 1 ? 'brand has' : 'brands have'} a copy`;
	const usage = (template: (typeof templates)[number]) =>
		template.isDefault
			? `Brands without an active configuration get it${template.brands ? `; ${copies(template.brands)}` : ''}`
			: copies(template.brands);
</script>

<AdminPageHeader
	title="Report templates"
	description="Ready-made report layouts. A brand's Reports tab copies one into a configuration of its own; brands without one get the default.">
	{#snippet rightTitle()}
		<Button
			size="sm"
			icon={Plus}
			loading={createAction_.executing}
			onclick={() => createAction_.execute()}>New template</Button>
	{/snippet}
</AdminPageHeader>

{#if templates.length}
	<div class="grid grid-cols-1 gap-3 pb-12 lg:grid-cols-2">
		{#each templates as template (template.id)}
			<div class="bg-paper border-line flex flex-col gap-3 rounded-md border p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<a
							href={`/admin/reports/templates/${template.id}`}
							class="text-ink text-base font-semibold no-underline hover:underline"
							>{template.name}</a>
						{#if template.description}
							<p class="text-muted-foreground m-0 mt-0.5 text-sm">
								{template.description}
							</p>
						{/if}
					</div>
					{#if template.isDefault}<Badge variant="tint" icon={Star}>Default</Badge>{/if}
				</div>
				<p class="text-reading-ink m-0 text-[13px] leading-snug">
					<span class="font-medium">{template.sections.length} sections:</span>
					{sectionsOutline(template.sections)}
				</p>
				<div class="mt-auto flex flex-wrap items-center justify-between gap-2">
					<span class="text-muted-foreground text-xs">{usage(template)}</span>
					<div class="flex gap-2">
						<Button
							size="sm"
							variant="ghost"
							href={`/admin/reports?templateId=${template.id}`}>Reports</Button>
						{#if !template.isDefault}
							<Button
								size="sm"
								variant="ghost"
								loading={defaultAction.executing}
								onclick={() => defaultAction.execute(template.id)}
								>Make default</Button>
						{/if}
						<Button
							size="sm"
							variant="outline"
							href={`/admin/reports/templates/${template.id}`}>Edit</Button>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<EmptyState
		ground="paper"
		title="No report templates yet"
		hint="Until there is one, a brand without a configuration gets the full report.">
		<Button size="sm" icon={Plus} onclick={() => createAction_.execute()}>New template</Button>
	</EmptyState>
{/if}
