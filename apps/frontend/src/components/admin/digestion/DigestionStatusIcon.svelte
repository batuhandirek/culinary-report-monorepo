<script lang="ts">
	import { Ban, CircleCheck, CircleDashed } from '@lucide/svelte';

	import { digestionStatusLabel } from '#lib/digestion.js';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// How far the pipeline got with a source, as one icon with its words on hover: digested (green
	// tick), skipped by the gate (with why), not read yet (dashed).
	interface Props {
		status: string;
		skipReason?: string;
	}

	let { status, skipReason }: Props = $props();

	const label = $derived(digestionStatusLabel(status, skipReason));
	const Icon = $derived(status === 'digested' ? CircleCheck : status === 'skipped' ? Ban : CircleDashed);
	const tone = $derived(status === 'digested' ? 'text-success' : status === 'skipped' ? 'text-muted-foreground' : 'text-faint');
</script>

<Tooltip text={label[0].toUpperCase() + label.slice(1)}>
	<Icon class={['size-4', tone]} aria-label={label} />
</Tooltip>
