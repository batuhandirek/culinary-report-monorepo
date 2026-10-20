<script lang="ts">
	import type { AdminProspectOutputDto } from 'client';

	import ProspectComposer from './ProspectComposer.svelte';
	import ProspectDetails from './ProspectDetails.svelte';
	import ProspectLog from './ProspectLog.svelte';
	import ProspectPortal from './ProspectPortal.svelte';
	import ProspectReport from './ProspectReport.svelte';

	import { onDay } from '#components/admin/admin-format.js';
	import { isDueToday } from '#lib/outreach-status.js';
	import Notice from '#ui/wrapped/Notice.svelte';

	// Everything for working one prospect: the next message, the log and the details. The brand
	// page's Sales tab shows it.
	interface Props {
		prospect: AdminProspectOutputDto;
		/** Every change answers with the whole prospect, which replaces this one. */
		onChange: (prospect: AdminProspectOutputDto) => void;
		/** After "Remove from the sales list"; the default goes back to the list. */
		onRemove?: () => void;
		/** The "Their report" panel. The brand page has its own Reports tab. */
		report?: boolean;
	}

	let { prospect, onChange, onRemove, report = true }: Props = $props();

	const due = $derived(isDueToday(prospect.nextFollowUpAt));
	const sequenceOver = $derived(
		prospect.stage === 'CONTACTED' && !prospect.nextFollowUpAt && prospect.outreachCount >= 3
	);
	const optedOut = $derived(prospect.stage === 'OPTED_OUT');
</script>

<div class="flex min-w-0 flex-col gap-5">
	{#if optedOut}
		<Notice
			tone="danger"
			title="They asked not to be contacted"
			text="Don't write, call or DM them again. The record stays so that nobody does." />
	{:else if sequenceOver}
		<Notice
			tone="warning"
			title={`No answer after ${prospect.outreachCount} tries`}
			text="Mark them as lost, or set a follow-up date to try again in a few months." />
	{:else if due}
		<Notice
			tone="warning"
			title={`Follow-up due ${onDay(prospect.nextFollowUpAt)}`}
			text="The composer below has the next message ready." />
	{/if}

	<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
		<div class="flex min-w-0 flex-col gap-5">
			{#if !optedOut}
				{#key prospect.id}
					<ProspectComposer {prospect} {onChange} />
				{/key}
			{/if}
			<ProspectLog {prospect} {onChange} />
		</div>
		<div class="flex min-w-0 flex-col gap-5">
			<ProspectDetails {prospect} {onChange} {onRemove} />
			{#if report}
				<ProspectReport {prospect} />
			{/if}
			<ProspectPortal {prospect} {onChange} />
		</div>
	</div>
</div>
