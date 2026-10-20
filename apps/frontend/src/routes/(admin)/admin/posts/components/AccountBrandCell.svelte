<script lang="ts">
	import type { AdminAccountOutputDto } from 'client';

	import { ACCOUNT_SOURCE_LABELS, branchLabel } from '#lib/accounts.js';

	// Whose own account it is (or whose it looks like): the brand, the branch, and why.
	interface Props {
		account: AdminAccountOutputDto;
	}

	let { account }: Props = $props();

	const brand = $derived(account.brand ?? account.suggestedBrand);
	const why = $derived(
		account.brand
			? [account.branch && `${branchLabel(account.branch)}'s own`, account.brandSource && ACCOUNT_SOURCE_LABELS[account.brandSource]]
					.filter(Boolean)
					.join(' · ')
			: account.suggestedScore !== undefined
				? `looks like it: ${Math.round(account.suggestedScore * 100)}% alike`
				: ''
	);
</script>

{#if brand}
	<span class="flex min-w-0 flex-col leading-tight">
		<a href={`/admin/brands/${brand.id}`} class="max-w-[18rem] truncate font-medium hover:underline" title={brand.name}
			>{brand.name}</a>
		<span class="text-muted-foreground max-w-[18rem] truncate text-xs">{why}</span>
	</span>
{:else}
	<span class="text-faint">—</span>
{/if}
