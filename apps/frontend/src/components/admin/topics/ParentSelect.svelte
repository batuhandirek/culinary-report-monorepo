<script lang="ts">
	import Select from '#ui/wrapped/Select.svelte';

	// A form `custom` field over the dropdown: the form's own `select` lays every option out as a
	// tile, too many for 128 possible parents
	interface Props {
		value: string;
		onChange: (value: string) => void;
		items: { value: string; label: string }[];
	}

	let { value, onChange, items }: Props = $props();
</script>

<Select {items} {value} onValueChange={(v) => onChange(v)} width="100%" aria-label="Belongs to" />
