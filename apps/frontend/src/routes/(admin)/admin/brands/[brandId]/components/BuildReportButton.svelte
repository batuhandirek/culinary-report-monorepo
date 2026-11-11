<script lang="ts">
	import { ChevronDown, FileText } from '@lucide/svelte';
	import type { AdminReportConfigOutputDto } from 'client';

	import { monthLabel, recentMonths } from '#lib/culinary.js';
	import * as DropdownMenu from '#ui/primitives-new/dropdown-menu/index.js';
	import { Spinner } from '#ui/primitives-new/spinner/index.js';

	// The brand page's one primary action: the acid key builds the month (the last finished one,
	// or the page's `?month=`) for every active configuration; its chevron picks another month or
	// one configuration.
	interface Props {
		month: string;
		configs: AdminReportConfigOutputDto[] | null;
		building: boolean;
		onBuild: (config?: AdminReportConfigOutputDto) => void;
		onMonth: (month: string) => void;
	}

	let { month, configs, building, onBuild, onMonth }: Props = $props();

	const active = $derived(configs?.filter((c) => (c.status as string) === 'active') ?? []);
	const MONTHS = recentMonths(7).slice(1);
	const KEY =
		'bg-primary border-ink text-ink inline-flex h-[30px] cursor-pointer items-center border-2 text-[12.5px] font-semibold hover:bg-primary-lighter disabled:cursor-default disabled:opacity-60';
</script>

<span class="inline-flex">
	<button
		type="button"
		class="{KEY} gap-1.5 rounded-l-md border-r-0 pr-2 pl-2.5"
		title={`Builds ${monthLabel(month)}${active.length > 1 ? ` for its ${active.length} active configurations` : ''}; pick another in the menu`}
		disabled={building}
		onclick={() => onBuild()}>
		{#if building}<Spinner class="size-3.5" />{:else}<FileText class="size-3.5" strokeWidth={1.8} />{/if}
		Build report
	</button>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="{KEY} rounded-r-md border-l-ink/30 border-l pr-1.5 pl-1"
			aria-label="Another month or configuration"
			disabled={building}>
			<ChevronDown class="size-[13px]" strokeWidth={2} />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="w-64" side="bottom" align="end">
			<DropdownMenu.Label>Month</DropdownMenu.Label>
			<DropdownMenu.RadioGroup value={month} onValueChange={(v) => v && onMonth(v)}>
				{#each MONTHS as m (m)}
					<DropdownMenu.RadioItem value={m} closeOnSelect={false}>{monthLabel(m)}</DropdownMenu.RadioItem>
				{/each}
			</DropdownMenu.RadioGroup>
			{#if configs?.length}
				<DropdownMenu.Separator />
				<DropdownMenu.Label>Build {monthLabel(month)} for</DropdownMenu.Label>
				{#each configs as config (config.id)}
					<DropdownMenu.Item onclick={() => onBuild(config)}>
						<span class="min-w-0 flex-1 truncate">{config.name}</span>
						{#if (config.status as string) !== 'active'}<span class="text-faint text-xs">inactive</span>{/if}
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Item onclick={() => onBuild()}>
					{active.length ? `Every active configuration (${active.length})` : 'Default template'}
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</span>
