<script lang="ts">
	import type { AdminAccountOutputDto } from 'client';

	import PlatformIcon from '#components/admin/detail/PlatformIcon.svelte';
	import { PLATFORM_LABELS } from '#lib/culinary.js';

	// An account in a table, on one line: the platform's glyph and the handle linking to the
	// profile; the name it shows on hover.
	interface Props {
		account: AdminAccountOutputDto;
	}

	let { account }: Props = $props();
</script>

<span class="flex min-w-0 items-center gap-1.5">
	<PlatformIcon platform={account.platform} tip class="text-muted-foreground" />
	<a
		href={account.url}
		target="_blank"
		rel="noreferrer"
		class="max-w-[16rem] truncate font-medium hover:underline"
		title={[PLATFORM_LABELS[account.platform], account.displayName].filter(Boolean).join(' · ')}>@{account.handle}</a>
</span>
