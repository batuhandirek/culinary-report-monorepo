<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { ENGLISH_UI_LABELS } from '#constants/ENGLISH_UI_LABELS.js';
	import { setUiLabels } from '#ui/lib/ui-labels.js';

	let { children }: { children?: Snippet } = $props();

	// The venue portal is in English, like the reports: its people are venue owners in Berlin.
	// The document says so while it is mounted (pixel labels uppercase by `lang`), and so do
	// the design system's fallback words.
	onMount(() => {
		const before = document.documentElement.lang || 'tr';
		document.documentElement.lang = 'en';
		return () => (document.documentElement.lang = before);
	});
	setUiLabels(() => ENGLISH_UI_LABELS);
</script>

<div class="bg-sand checker min-h-dvh" lang="en">
	{@render children?.()}
</div>
