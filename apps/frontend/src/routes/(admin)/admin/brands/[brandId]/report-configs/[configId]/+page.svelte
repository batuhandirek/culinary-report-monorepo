<script lang="ts">
	import { Save, Trash2 } from '@lucide/svelte';

	import { untrack } from 'svelte';

	import {
		type AdminReportConfigOutputDto,
		AdminUpdateReportConfigInputDtoStatusEnum as Status
	} from 'client';

	import { goto } from '$app/navigation';
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
	import SwitchRow from '#ui/wrapped/SwitchRow.svelte';

	// One of a brand's report configurations: its own copy of the sections, edited for this brand
	// alone. While active it gets a report of its own every month; built reports keep the sections
	// they were built with.
	let { data } = $props();
	const brand = $derived(data.brand);
	const back = $derived(`/admin/brands/${data.brand.id}?tab=reports`);

	// The output's status enum is a twin of the input's: compare by value
	const isActive = (c: AdminReportConfigOutputDto) => (c.status as string) === Status.Active;
	const toForm = (c: AdminReportConfigOutputDto) => ({
		name: c.name,
		active: isActive(c),
		sections: toSectionsDraft(c.sections)
	});
	let saved = $state<AdminReportConfigOutputDto>(untrack(() => data.reportConfig));
	let form = $state(untrack(() => toForm(data.reportConfig)));
	$effect.pre(() => {
		const next = data.reportConfig;
		if (next.id !== untrack(() => saved.id)) {
			saved = next;
			form = toForm(next);
		}
	});
	const dirty = $derived(JSON.stringify(form) !== JSON.stringify(toForm(saved)));

	const saveAction = createAction(
		() =>
			api.admin.updateReportConfig(saved.id, {
				name: form.name.trim(),
				status: form.active ? Status.Active : Status.Inactive,
				sections: fromSectionsDraft(form.sections)
			}),
		{
			onSuccess: (c) => {
				saved = c;
				form = toForm(c);
			},
			successNotification: (c) => ({
				title: `${c.name} saved`,
				text: isActive(c)
					? 'Reports built from now on follow it; built ones keep their layout.'
					: 'Paused: the monthly run skips it until it is switched back on.'
			})
		}
	);
	let deleting = $state(false);
	const deleteAction = createAction(() => api.admin.deleteReportConfig(saved.id), {
		onSuccess: () => goto(back),
		successNotification: { title: 'Configuration deleted', text: 'Its reports stay.' }
	});
</script>

<!-- Full height on desktop, so the editor's two columns scroll on their own -->
<div class="flex flex-col xl:h-full xl:min-h-0">
	<AdminPageHeader
		title={saved.name}
		description={`A report ${brand.name} gets every month while it is active.`}>
		{#snippet children()}
			{#if !isActive(saved)}<Badge variant="quiet">Inactive</Badge>{/if}
		{/snippet}
		{#snippet rightTitle()}
			<div class="flex shrink-0 items-center gap-2">
				<Button size="sm" variant="ghost" href={back}>Back to {brand.name}</Button>
				<Button size="sm" variant="outline" icon={Trash2} onclick={() => (deleting = true)}
					>Delete</Button>
				<Button
					size="sm"
					icon={Save}
					disabled={!dirty || !form.name.trim()}
					loading={saveAction.executing}
					onclick={() => saveAction.execute()}>Save</Button>
			</div>
		{/snippet}
	</AdminPageHeader>

	<ReportSectionsEditor bind:draft={form.sections} brandId={brand.id}>
		{#snippet details()}
			<AdminPanel title="Details">
				<div class="flex flex-col gap-3">
					<label class="flex flex-col gap-1 text-sm">
						<span class="font-medium">Name</span>
						<Input bind:value={form.name} maxlength={80} />
					</label>
					<p class="text-muted-foreground m-0 text-xs">
						{#if saved.template}
							Copied from the template
							<a
								href={`/admin/reports/templates/${saved.template.id}`}
								class="text-beet">{saved.template.name}</a
							>; changes here stay with {brand.name}.
						{:else}
							A custom configuration: it was not copied from a template, or that
							template is deleted.
						{/if}
					</p>
					<SwitchRow
						title="Active"
						hint="Built into a report of its own every month. Off: paused, its reports stay."
						checked={form.active}
						onChange={(on) => (form.active = on)} />
				</div>
			</AdminPanel>
		{/snippet}
	</ReportSectionsEditor>
</div>

<PopConfirm
	bind:open={deleting}
	title={`Delete ${saved.name}?`}
	description={`${brand.name} stops getting this report. The reports already built stay.`}
	confirmText="Delete the configuration"
	destructive
	onConfirm={() => deleteAction.execute()} />
