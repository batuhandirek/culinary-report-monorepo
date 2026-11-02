<script lang="ts">
	import ClaimsTable from '#components/admin/statements/ClaimsTable.svelte';

	// The city's month as claims: what agents A and B made of its reviews and posts
	interface Props {
		cityId: string;
		month: string;
	}

	let { cityId, month }: Props = $props();
</script>

<ClaimsTable
	scope={{ cityId, month }}
	topicsCityId={cityId}
	scopeLabel="Every review and post of the city's month, whatever the table below filters" />
