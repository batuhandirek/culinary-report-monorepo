<script lang="ts">
	import Switch from '#ui/primitives-new/switch/switch.svelte';

	// A source's on/off switch in the sources table: saves on its own, falls back on a refusal
	interface Props {
		checked: boolean;
		label: string;
		onChange: (checked: boolean) => Promise<unknown>;
	}

	let { checked, label, onChange }: Props = $props();
	let saving = $state(false);
</script>

<Switch
	checked={checked}
	disabled={saving}
	aria-label={label}
	onCheckedChange={async (value) => {
		saving = true;
		try {
			await onChange(value);
		} finally {
			saving = false;
		}
	}} />
