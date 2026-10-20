<script lang="ts">
	import { Share2 } from '@lucide/svelte';

	import { notificationManager } from '#ui/lib/notification-manager.js';
	import type { ButtonSize } from '#ui/primitives-new/button/index.js';
	import Button from '#ui/wrapped/Button.svelte';

	// The system share sheet where the browser has one (phones), otherwise the link goes to
	// the clipboard. Pass the canonical address, not `location.href`, so a tracking query the
	// reader arrived with is not handed on.
	let {
		url,
		title,
		size = 'default',
		class: className = ''
	}: {
		url: string;
		title: string;
		size?: ButtonSize;
		class?: string;
	} = $props();

	const share = async () => {
		if (navigator.share) {
			// Closing the sheet rejects with AbortError; that is the reader's answer, not a failure.
			await navigator.share({ title, url }).catch(() => {});
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
			notificationManager.addNotification({ title: 'Link copied', text: url, success: true });
		} catch {
			notificationManager.addNotification({ title: "Couldn't copy the link", text: url });
		}
	};
</script>

<Button variant="outline" {size} icon={Share2} class={className} onclick={share}>Share</Button>
