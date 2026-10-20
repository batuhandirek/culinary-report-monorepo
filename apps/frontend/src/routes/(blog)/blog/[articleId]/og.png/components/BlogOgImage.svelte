<svelte:options css="injected" />

<script lang="ts">
	import type { BlogEntryOutputDto } from 'client';

	// Satori renders this statically: plain flex and the palette as literal colours (oat
	// ground, plum ink, beet label, the acid block), no tokens.
	interface Props {
		entry: BlogEntryOutputDto;
	}

	let { entry }: Props = $props();

	const dateLabel = $derived(
		entry.publishedAt
			? new Date(entry.publishedAt).toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: ''
	);
	const tagLabel = $derived((entry.tags ?? []).map((t) => `#${t.name}`).join('  '));
</script>

<div class="flex h-full w-full bg-[#f2ede3]">
	<div class="flex flex-col justify-between flex-1 pl-16 pr-12 py-14">
		<div class="flex flex-col">
			<div class="flex items-center mb-8">
				<div class="flex w-6 h-6 bg-[#c6f135] border-2 border-[#1f1724] mr-4"></div>
				<div class="flex text-3xl font-semibold text-[#8c2d5c]">Culinary Report · Blog</div>
			</div>
			<div class="flex">
				<p class="text-6xl font-semibold text-[#1f1724] leading-tight">{entry.title}</p>
			</div>
			{#if entry.excerpt}
				<div class="flex mt-6">
					<p class="text-3xl text-[#5e5466] leading-snug">{entry.excerpt}</p>
				</div>
			{/if}
		</div>

		<div class="flex flex-col">
			{#if tagLabel}
				<div class="flex text-2xl text-[#766b79] mb-3">{tagLabel}</div>
			{/if}
			<div class="flex text-2xl text-[#5e5466]">
				{#if entry.author?.publicName}<span>{entry.author.publicName}</span>{/if}
				{#if entry.author?.publicName && dateLabel}<span class="px-3">·</span>{/if}
				{#if dateLabel}<span>{dateLabel}</span>{/if}
			</div>
		</div>
	</div>

	{#if entry.coverImage}
		<div class="flex w-[460px] h-full">
			<img
				src={entry.coverImage.url}
				width="460"
				height="630"
				alt=""
				style="object-fit: cover; width: 460px; height: 630px;" />
		</div>
	{/if}
</div>
