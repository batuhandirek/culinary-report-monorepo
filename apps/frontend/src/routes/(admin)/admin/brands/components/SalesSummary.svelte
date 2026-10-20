<script lang="ts">
	import { BellRing, CalendarCheck, Hourglass, Inbox, Reply, Send, Trophy } from '@lucide/svelte';
	import type { AdminOutreachSummaryOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { type ProspectStage } from '#lib/outreach-status.js';
	import Stat from '#ui/components/Stat.svelte';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';

	// The sales list at a glance. Each tile is a link that filters the brand list below.
	let summary = $state<AdminOutreachSummaryOutputDto | null>(null);
	createAutoLoader(api.admin.getOutreachSummary, [], {
		onSuccess: (result) => (summary = result)
	});

	const count = (stage: ProspectStage) =>
		summary?.stages.find((row) => row.stage === stage)?.count ?? 0;

	const TILES = $derived([
		{
			title: 'Follow up today',
			value: summary?.due ?? 0,
			href: '/admin/brands?segment=prospects&sort=followUp:asc',
			icon: BellRing,
			tone: summary?.due ? ('danger' as const) : ('default' as const)
		},
		{
			title: 'To contact',
			value: count('TO_CONTACT'),
			href: '/admin/brands?segment=prospects&stage=TO_CONTACT',
			icon: Inbox
		},
		{
			title: 'Waiting',
			value: count('CONTACTED'),
			href: '/admin/brands?segment=prospects&stage=CONTACTED',
			icon: Hourglass
		},
		{
			title: 'Replied',
			value: count('REPLIED'),
			href: '/admin/brands?segment=prospects&stage=REPLIED',
			icon: Reply
		},
		{
			title: 'Meeting',
			value: count('MEETING'),
			href: '/admin/brands?segment=prospects&stage=MEETING',
			icon: CalendarCheck
		},
		{
			title: 'Won',
			value: count('WON'),
			href: '/admin/brands?segment=customers',
			icon: Trophy,
			tone: count('WON') ? ('success' as const) : ('default' as const)
		},
		{
			title: 'Sent, 7 days',
			value: summary?.outreachLast7Days ?? 0,
			icon: Send
		}
	]);
</script>

<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
	{#each TILES as tile (tile.title)}
		<Stat size="sm" {...tile} loading={!summary} />
	{/each}
</div>
