<script lang="ts">
	import { Plus, Search } from '@lucide/svelte';
	import type { AdminMissingAspectOutputDto, AdminStatementClustersOutputDto } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { sentimentVariant } from '#lib/culinary.js';
	import { topicHref } from '#lib/topic-format.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// What the aspect tree lacks: the scope's claims filed under no aspect, or only at a root,
	// grouped by meaning, each group with the aspect the model suggests for it. Nothing here is
	// stored or counted anywhere: a group moves when it is worked out again. Plain data and
	// callbacks, so it can be mounted with any data.
	interface Props {
		result: AdminStatementClustersOutputDto;
		/** A root's label by its key */
		rootLabel: (key: string) => string;
		onCreateAspect: (cluster: AdminMissingAspectOutputDto) => void;
		onSeeClaims: (cluster: AdminMissingAspectOutputDto) => void;
	}

	let { result, rootLabel, onCreateAspect, onSeeClaims }: Props = $props();

	const n = (value: number) => value.toLocaleString('en-GB');
	const MAX_BRANDS = 6;
</script>

<div class="flex flex-col gap-4">
	<p class="text-muted-foreground m-0 text-sm">
		{n(result.clusters.length + result.more)} {result.clusters.length + result.more === 1 ? 'group' : 'groups'} of 5+ claims from 3+
		sources and 2+ brands, out of {n(result.considered)}
		{#if result.considered < result.claims}(a sample) of {n(result.claims)}{/if}
		claims with no aspect or only a root{#if result.more}; the {n(result.clusters.length)} largest are shown{/if}.
		{#if result.notEmbedded}{n(result.notEmbedded)} more have no vector yet and are not read.{/if}
		Groups move when worked out again: never quote their counts.
	</p>

	{#if !result.clusters.length}
		<EmptyState
			title={result.claims ? 'No group large enough' : 'Nothing to group yet'}
			hint={result.claims
				? 'The claims no aspect fits say different things: none reach 5 claims from 3 sources and 2 brands.'
				: result.notEmbedded
					? 'The claims have no vectors yet: the embeddings backlog fills them once its spend is approved.'
					: 'Every claim of the scope is filed under a finer aspect.'} />
	{/if}

	{#each result.clusters as cluster, i (i)}
		<AdminPanel title={cluster.label ?? 'Unnamed group'} note={`${n(cluster.claims)} claims · ${n(cluster.sources)} sources`}>
			{#snippet action()}
				<div class="flex gap-2">
					<Button size="sm" variant="outline" icon={Search} onclick={() => onSeeClaims(cluster)}>See claims</Button>
					<Button size="sm" icon={Plus} disabled={!cluster.label} onclick={() => onCreateAspect(cluster)}>Create aspect</Button>
				</div>
			{/snippet}
			<div class="flex flex-col gap-3 text-sm">
				<div class="flex flex-wrap items-center gap-2">
					{#if cluster.root}<Badge sm variant="secondary">under {rootLabel(cluster.root)}</Badge>{/if}
					{#each cluster.filedAt as filed (filed.aspect ?? '-')}
						<span class="text-muted-foreground text-xs">{filed.label}: {n(filed.claims)}</span>
					{/each}
				</div>
				{#if cluster.hint}<p class="m-0">{cluster.hint}</p>{/if}
				{#if cluster.fits}
					<p class="m-0">
						<Badge sm variant="warning">Already covered</Badge>
						The model says <a class="underline" href={topicHref(cluster.fits.key)}>{cluster.fits.label}</a> covers these: they
						should have been filed there.
					</p>
				{/if}
				<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
					{#each cluster.samples as sample (sample.id)}
						<li class="flex items-baseline gap-2">
							{#if sample.sentiment}<Badge sm variant={sentimentVariant(sample.sentiment)}>{sample.sentiment}</Badge>{/if}
							<span>“{sample.text}”</span>
							<span class="text-muted-foreground text-xs whitespace-nowrap">
								{sample.sourceKind === 'review' ? 'review' : 'post'}{#if sample.brandName} · {sample.brandName}{/if}
							</span>
						</li>
					{/each}
				</ul>
				<p class="text-muted-foreground m-0 text-xs">
					{#each cluster.brands.slice(0, MAX_BRANDS) as brand, b (b)}
						{#if b}, {/if}{#if brand.id}<a class="underline" href={`/admin/brands/${brand.id}`}>{brand.name}</a>{:else}{brand.name}{/if}
						({n(brand.claims)})
					{/each}
					{#if cluster.brands.length > MAX_BRANDS}and {n(cluster.brands.length - MAX_BRANDS)} more{/if}
				</p>
			</div>
		</AdminPanel>
	{/each}
</div>
