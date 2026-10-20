<script lang="ts">
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import type { ComponentProps } from 'svelte';

	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import { cn } from '#ui/lib/utils.js';

	type Props = ComponentProps<typeof Loader2Icon>;

	const labels = getUiLabels();

	let { class: className, ...restProps }: Props = $props();
</script>

<Loader2Icon
	role="status"
	aria-label={labels.loading}
	class={cn('size-4 animate-spin', className)}
	{...restProps} />
