<script lang="ts">
	import { Send } from '@lucide/svelte';
	import type { AdminBrandOutputDto } from 'client';

	import type { BrandProspectStore } from '../stores/BrandProspectStore.svelte.js';

	import LeadScorePanel from './LeadScorePanel.svelte';

	import { onDay } from '#components/admin/admin-format.js';
	import ProspectStageSelect from '#components/admin/outreach/ProspectStageSelect.svelte';
	import ProspectWorkspace from '#components/admin/outreach/ProspectWorkspace.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// Selling the report to this brand: the next message, the log, its contacts and portal, and
	// why it scores as a prospect. Every message logged sets the next follow-up.
	interface Props {
		brand: AdminBrandOutputDto;
		sales: BrandProspectStore;
	}

	let { brand, sales }: Props = $props();

	const prospect = $derived(sales.prospect);
	const open = $derived(brand.branches.some((b) => !b.closed));
</script>

<div class="flex min-w-0 flex-col gap-5">
	{#if prospect}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-muted-foreground m-0 text-sm">
				On the sales list since {onDay(prospect.createdAt)} · {prospect.outreachCount}
				{prospect.outreachCount === 1 ? 'try' : 'tries'}
			</p>
			<ProspectStageSelect {prospect} onChange={sales.update} />
		</div>
		<ProspectWorkspace
			{prospect}
			onChange={sales.update}
			onRemove={() => sales.update(null)}
			report={false} />
	{:else if prospect === null}
		<EmptyState
			icon={Send}
			title="Not on the sales list"
			hint={open
				? 'Add it to write to them from here. The emails quote its newest report, and each message you log sets the next follow-up.'
				: 'It has no open place.'}>
			{#if open}
				<Button
					size="sm"
					icon={Send}
					loading={sales.addAction.executing}
					onclick={() => sales.addAction.execute()}>
					Add to sales
				</Button>
			{/if}
		</EmptyState>
	{:else if sales.loader.failed}
		<EmptyState icon={Send} tone="danger" title="Couldn't load its sales record">
			<Button size="sm" variant="outline" onclick={() => sales.load(brand.id)}>Try again</Button>
		</EmptyState>
	{:else}
		<p class="text-muted-foreground m-0 text-sm">Loading…</p>
	{/if}

	<div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
		<LeadScorePanel {brand} />
	</div>
</div>
