<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';

	import PortalReport from '../../components/PortalReport.svelte';

	import { page } from '$app/state';
	import Button from '#ui/wrapped/Button.svelte';

	const brandId = $derived(page.params.brandId!);
	const reportId = $derived(page.params.reportId!);
</script>

<div>
	<Button variant="link" class="h-11 px-0" icon={ArrowLeft} href={`/portal/${brandId}/months`}>
		All months
	</Button>
</div>
{#key reportId}
	<PortalReport {brandId} {reportId} />
{/key}
