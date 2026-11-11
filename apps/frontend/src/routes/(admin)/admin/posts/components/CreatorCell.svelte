<script lang="ts">
	import type { AdminCreatorRowOutputDto } from 'client';

	import PlatformIcon from '#components/admin/detail/PlatformIcon.svelte';

	// A creator in the list, on one line: the name, then a glyph per account with its handle on
	// hover (a venue's own says whose).
	interface Props {
		row: AdminCreatorRowOutputDto;
	}

	let { row }: Props = $props();
</script>

<span class="flex min-w-0 items-center gap-2">
	<a href={`/admin/creators/${row.id}`} class="max-w-[18rem] truncate font-medium hover:underline" title={row.name}>{row.name}</a>
	<span class="text-muted-foreground flex shrink-0 items-center gap-1">
		{#each row.accounts as account (account.handle + account.platform)}
			<PlatformIcon platform={account.platform} tip={`@${account.handle}${account.brand ? ` · ${account.brand.name}'s own` : ''}`} class={account.brand ? 'text-beet' : ''} />
		{/each}
	</span>
</span>
