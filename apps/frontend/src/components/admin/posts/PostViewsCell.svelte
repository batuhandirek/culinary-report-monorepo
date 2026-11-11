<script lang="ts">
	import { Eye } from '@lucide/svelte';

	import { viewsLabel } from '#lib/culinary.js';

	// A post row's views: the eye and the compact count ("—" for a blog article, which has none)
	interface Props {
		platform: string;
		views: number | null | undefined;
	}

	let { platform, views }: Props = $props();
</script>

<span class="text-muted-foreground inline-flex items-center gap-1"
	><Eye class="size-3.5" /><span class="text-ink">{viewsLabel(platform, views)}</span></span>
