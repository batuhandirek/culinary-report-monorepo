<script lang="ts">
	import type { AdminAccountOutputDto } from 'client';

	import { PLATFORM_LABELS } from '#lib/culinary.js';

	// An account in a table: the handle linking to the profile, the platform and the name it shows.
	interface Props {
		account: AdminAccountOutputDto;
	}

	let { account }: Props = $props();
</script>

<span class="flex min-w-0 flex-col leading-tight">
	<a
		href={account.url}
		target="_blank"
		rel="noreferrer"
		class="max-w-[18rem] truncate font-medium hover:underline"
		title={`@${account.handle}`}>@{account.handle}</a>
	<span class="text-muted-foreground max-w-[18rem] truncate text-xs">
		{[PLATFORM_LABELS[account.platform], account.displayName].filter(Boolean).join(' · ')}
	</span>
</span>
