<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';

	type Props = {
		value: string;
		disabled: boolean | null;
		active: boolean;
		onDelete: (value: string) => void;
	};

	let { value, disabled, onDelete, active }: Props = $props();
</script>

<div
	class="border-line bg-sand text-ink ring-offset-background aria-selected:ring-ring flex place-items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-1.5 text-sm transition-all hover:cursor-default aria-selected:ring-2 aria-selected:ring-offset-2"
	aria-selected={active}>
	<span>
		{value}
	</span>
	<button
		type="button"
		class="text-muted-foreground hover:text-ink"
		aria-label={`Remove ${value}`}
		{disabled}
		onclick={() => onDelete(value)}>
		<XIcon class="size-4" />
	</button>
</div>
