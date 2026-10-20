<script lang="ts">
	interface Props {
		schema: Record<string, unknown> | Record<string, unknown>[];
	}

	let { schema }: Props = $props();

	// `svelte-meta-tags`' `JsonLd` writes `JSON.stringify` straight into the tag, and JSON
	// leaves `<` alone — a listing title holding a closing script tag would end the block
	// and inject markup. Structured data carrying user-written text goes through here.
	const json = $derived(
		JSON.stringify(
			(Array.isArray(schema) ? schema : [schema]).map((item) => ({
				'@context': 'https://schema.org',
				...item
			}))
		).replace(/</g, '\\u003c')
	);
</script>

<svelte:head>
	<!-- The tag is assembled from halves so the preprocessor does not read it as this
	     component's own script block. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `${'<scri' + 'pt type="application/ld+json">'}${json}${'</scri' + 'pt>'}`}
</svelte:head>
