<script lang="ts">
	import { onMount } from 'svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	// `/auth` itself is nothing; login is where it leads, with whatever it carried.
	onMount(() => goto(`/auth/login${page.url.search}`, { replace: true }));
</script>
