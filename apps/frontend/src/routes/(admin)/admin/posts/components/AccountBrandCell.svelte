<script lang="ts">
	import type { AdminAccountOutputDto } from 'client';

	import { ACCOUNT_SOURCE_LABELS, branchLabel } from '#lib/accounts.js';

	// Whose own account it is (or whose it looks like), on one line: the brand, the branch and why
	// on hover, a suggestion's likeness beside it.
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

<!-- One line: the brand, why on hover; a suggestion shows how alike -->
{#if brand}
	<span class="flex min-w-0 items-center gap-1.5">
		<a href={`/admin/brands/${brand.id}`} class="max-w-[16rem] truncate font-medium hover:underline" title={why ? `${brand.name}: ${why}` : brand.name}
			>{brand.name}</a>
		{#if !account.brand && account.suggestedScore !== undefined}
			<span class="bg-wash text-muted-foreground shrink-0 rounded px-1.5 text-xs tabular-nums" title={why}>{Math.round(account.suggestedScore * 100)}%</span>
		{/if}
	</span>
{:else}
	<span class="text-faint">—</span>
{/if}
