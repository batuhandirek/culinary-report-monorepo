<script lang="ts">
	import { Send } from '@lucide/svelte';
	import type { AdminProspectListItemOutputDto, AdminReportOutputDto } from 'client';

	import { invalidate } from '$app/navigation';
	import { at, atShort } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';

	// The report e-mail to a venue that subscribed (a won prospect): the build mails it once
	// by itself; "Send now" mails it again. Hidden for venues that are not customers.
	interface Props {
		report: AdminReportOutputDto;
	}

	let { report }: Props = $props();

	let prospect = $state<AdminProspectListItemOutputDto | null>(null);
	createAutoLoader(api.admin.listProspects, [{ page: 1, size: 1, brandId: report.brand.id }], {
		onSuccess: (res) => (prospect = res.items[0] ?? null)
	});
	const won = $derived(prospect?.stage === 'WON');

	let confirmSend = $state(false);
	const sendAction = createAction(() => api.admin.sendReport(report.id), {
		onSuccess: () => invalidate(`report:${report.id}`),
		successNotification: {
			title: 'Report e-mailed',
			text: `To ${prospect?.contactEmail}, logged on the outreach record`
		}
	});
</script>

{#if won || report.sentAt}
	<AdminPanel title="E-mail">
		{#snippet action()}
			{#if won && prospect?.contactEmail}
				<Button
					size="sm"
					variant="outline"
					icon={Send}
					loading={sendAction.executing}
					onclick={() => (confirmSend = true)}>
					Send now
				</Button>
			{/if}
		{/snippet}

		<p class="m-0 text-sm">
			{#if report.sentAt}
				E-mailed <span title={at(report.sentAt)}>{atShort(report.sentAt)}</span>.
			{:else if won && prospect?.contactEmail}
				Not e-mailed yet. A new month's report goes out by itself once it is built.
			{/if}
			{#if won && prospect?.contactEmail}
				<span class="text-muted-foreground">
					Goes to {prospect.contactEmail}, in {prospect.language === 'de' ? 'German' : 'English'}.
				</span>
			{:else if won}
				<span class="text-muted-foreground">
					{report.brand.name} subscribed but has no e-mail address:
					<a class="underline" href={`/admin/brands/${report.brand.id}?tab=sales`}>add one</a>.
				</span>
			{/if}
		</p>
	</AdminPanel>
{/if}

<PopConfirm
	bind:open={confirmSend}
	title="E-mail this report now?"
	description={`${report.brand.name} gets it at ${prospect?.contactEmail ?? ''}, with its private link. It is logged on its sales record.`}
	confirmText="Send"
	onConfirm={() => sendAction.execute()} />
