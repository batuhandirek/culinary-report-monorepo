<script lang="ts">
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';

	// A run's tags (`StartOptions.attributes`): the city by name, the rest as `key value`; its
	// priority first when it is not the usual `normal`.
	interface Props {
		attributes?: Record<string, string>;
		priority?: string;
	}

	let { attributes, priority }: Props = $props();

	const entries = $derived([
		...(priority && priority !== 'normal' ? [['priority', priority] as [string, string]] : []),
		...Object.entries(attributes ?? {})
	]);
	const cityName = (id: string) => adminCitiesStore.list.find((c) => c.id === id)?.name ?? id.slice(0, 8);
</script>

{#if entries.length}
	<span class="flex max-w-[28rem] flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
		{#each entries as [key, value] (key)}
			<span class="min-w-0 truncate" title={`${key}: ${value}`}>
				{#if key === 'cityId'}
					{cityName(value)}
				{:else}
					<span class="text-muted-foreground">{key}</span> {value}
				{/if}
			</span>
		{/each}
	</span>
{:else}
	<span class="text-faint">—</span>
{/if}
