<script lang="ts">
	import { Save, Star, Trash2 } from '@lucide/svelte';
	import type { AdminReportTemplateOutputDto } from 'client';

	import { untrack } from 'svelte';

	import { goto, invalidate } from '$app/navigation';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import ReportSectionsEditor from '#components/admin/reports/ReportSectionsEditor.svelte';
	import { api } from '#lib/api.js';
	import { fromSectionsDraft, toSectionsDraft } from '#lib/report-sections.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';

	// One ready-made template. Saving changes what the next copies start from; configurations
	// already copied from it keep their sections.
	let { data } = $props();

	const toForm = (t: AdminReportTemplateOutputDto) => ({
		name: t.name,
		description: t.description ?? '',
		sections: toSectionsDraft(t.sections)
	});
	let saved = $state<AdminReportTemplateOutputDto>(untrack(() => data.reportTemplate));
	let form = $state(untrack(() => toForm(data.reportTemplate)));
	$effect.pre(() => {
		// Another template opened in place
		const next = data.reportTemplate;
		if (next.id !== untrack(() => saved.id)) {
			saved = next;
			form = toForm(next);
		}
	});
	const dirty = $derived(JSON.stringify(form) !== JSON.stringify(toForm(saved)));

	const saveAction = createAction(
		() =>
			api.admin.updateReportTemplate(saved.id, {
				name: form.name.trim(),
				description: form.description.trim() || null,
				sections: fromSectionsDraft(form.sections)
			}),
		{
			onSuccess: (t) => {
				saved = t;
				form = toForm(t);
				invalidate('report-templates:list');
			},
			successNotification: {
				title: 'Template saved',
				text: 'New copies start from it; configurations already copied keep theirs.'
			}
		}
	);
	const defaultAction = createAction(() => api.admin.setDefaultReportTemplate(saved.id), {
		onSuccess: (t) => (saved = { ...saved, isDefault: t.isDefault }),
		successNotification: (t) => ({
			title: `${t.name} is the default`,
			text: 'Brands without an active configuration get it from their next report on.'
		})
	});
	let deleting = $state(false);
	const deleteAction = createAction(() => api.admin.deleteReportTemplate(saved.id), {
		onSuccess: () => goto('/admin/reports/templates', { invalidateAll: true }),
		successNotification: {
			title: 'Template deleted',
			text: 'Configurations and reports made from it keep their sections.'
		}
	});
</script>

<!-- Full height on desktop, so the editor's two columns scroll on their own -->
<div class="flex flex-col xl:h-full xl:min-h-0">
	<AdminPageHeader
		title={saved.name}
		description="A ready-made layout brands copy into their own configurations. The cover comes first and the appendix last.">
		{#snippet children()}
			{#if saved.isDefault}<Badge variant="tint" icon={Star}>Default</Badge>{/if}
		{/snippet}
		{#snippet rightTitle()}
			<div class="flex shrink-0 items-center gap-2">
				<Button size="sm" variant="ghost" href={`/admin/reports?templateId=${saved.id}`}
					>Its reports</Button>
				{#if !saved.isDefault}
					<Button
						size="sm"
						variant="ghost"
						loading={defaultAction.executing}
						onclick={() => defaultAction.execute()}>Make default</Button>
					<Button
						size="sm"
						variant="outline"
						icon={Trash2}
						onclick={() => (deleting = true)}>Delete</Button>
				{/if}
				<Button
					size="sm"
					icon={Save}
					disabled={!dirty || !form.name.trim()}
					loading={saveAction.executing}
					onclick={() => saveAction.execute()}>Save</Button>
			</div>
		{/snippet}
	</AdminPageHeader>

	<ReportSectionsEditor bind:draft={form.sections}>
		{#snippet details()}
			<AdminPanel title="Details">
				<div class="flex flex-col gap-3">
					<label class="flex flex-col gap-1 text-sm">
						<span class="font-medium">Name</span>
						<Input bind:value={form.name} maxlength={80} />
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span class="font-medium">What it is for</span>
						<Input
							bind:value={form.description}
							maxlength={400}
							placeholder="One line for the list" />
					</label>
					<p class="text-muted-foreground m-0 text-xs">
						{saved.brands}
						{saved.brands === 1 ? 'brand has' : 'brands have'} a copy.{saved.isDefault
							? ' Brands without an active configuration get this template.'
							: ''}
					</p>
				</div>
			</AdminPanel>
		{/snippet}
	</ReportSectionsEditor>
</div>

<PopConfirm
	bind:open={deleting}
	title={`Delete ${saved.name}?`}
	description="Configurations copied from it keep their sections, and its reports keep theirs; they just no longer point at it."
	confirmText="Delete the template"
	destructive
	onConfirm={() => deleteAction.execute()} />
