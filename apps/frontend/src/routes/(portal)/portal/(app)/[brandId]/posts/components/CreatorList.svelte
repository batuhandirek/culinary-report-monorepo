<script lang="ts">
	import { ExternalLink, Users } from '@lucide/svelte';
	import type {
		ListPortalCreatorsParamsPlatformEnum,
		PortalCreatorOutputDto,
		PortalCreatorsOutputDto
	} from 'client';

	import { api } from '#lib/api.js';
	import { authorLabel, compact, PLATFORM_LABELS } from '#lib/culinary.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The posts grouped by who made them, most viewed first: whom to thank, whom to invite back.
	interface Props {
		brandId: string;
		month?: string;
		/** `tiktok` or `instagram`; both when absent */
		platform?: string;
	}

	let { brandId, month, platform }: Props = $props();

	let request = $state<Promise<PortalCreatorsOutputDto>>(new Promise(() => {}));
	const load = () =>
		(request = api.portal.listPortalCreators(brandId, {
			...(month && { month }),
			...(platform && { platform: platform as ListPortalCreatorsParamsPlatformEnum })
		}) as Promise<PortalCreatorsOutputDto>);
	$effect(() => {
		load();
	});

	const figures = (c: PortalCreatorOutputDto) =>
		[
			c.authorFans != null ? `${compact(c.authorFans)} followers` : null,
			`${c.posts} ${c.posts === 1 ? 'post' : 'posts'}`,
			`${compact(c.views)} views`,
			c.paid ? `${c.paid} paid or gifted` : null
		]
			.filter(Boolean)
			.join(' · ');
</script>

{#await request}
	<SkeletonRows count={4} lines={2} boxed />
{:then { items }}
	{#if items.length}
		<ul class="bg-paper border-line m-0 flex list-none flex-col rounded-md border p-0">
			{#each items as creator, index (`${creator.platform}-${creator.author}`)}
				<li
					class={[
						'flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5',
						index > 0 && 'border-line border-t'
					]}>
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="flex flex-wrap items-baseline gap-x-2">
							<span class="text-ink font-semibold break-all">{authorLabel(creator.platform, creator.author)}</span>
							<span class="eyebrow text-beet">{PLATFORM_LABELS[creator.platform] ?? creator.platform}</span>
							{#if creator.own}<span class="eyebrow text-muted-foreground">Your account</span>{/if}
						</span>
						<span class="font-term text-muted-foreground text-base">{figures(creator)}</span>
					</div>
					<a
						href={creator.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-beet inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-2 hover:underline">
						Top post <ExternalLink class="size-3.5" aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState
			ground="paper"
			icon={Users}
			title="No creators here"
			hint="Nobody posted about you with these filters." />
	{/if}
{:catch}
	<ErrorState ground="paper" onRetry={load} />
{/await}
