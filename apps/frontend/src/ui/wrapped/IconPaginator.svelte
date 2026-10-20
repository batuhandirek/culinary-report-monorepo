<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	import * as Pagination from '#ui/primitives-new/pagination/index.js';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	interface Props {
		page: number;
		perPage: number;
		count: number;
		span?: number;
		onIncrement?: () => void;
		onDecrement?: () => void;
	}

	let {
		page = $bindable(),
		perPage = $bindable(),
		count = $bindable(),
		span = $bindable(1),
		onIncrement: onIncrementCallback,
		onDecrement: onDecrementCallback
	}: Props = $props();

	function onIncrement() {
		if (page === Math.ceil(count / perPage)) return;
		onIncrementCallback?.();
		page += 1;
	}
	function onDecrement() {
		if (page === 1) return;
		onDecrementCallback?.();
		page -= 1;
	}
</script>

<div>
	<Pagination.Root {count} {perPage} siblingCount={span} bind:page>
		{#snippet children({ pages })}
			<Pagination.Content>
				<Pagination.Item>
					<IconButton
						icon={ChevronLeft}
						label="Önceki sayfa"
						onclick={onDecrement}
						disabled={page <= 1}
						variant="ghost" />
				</Pagination.Item>
				{#each pages as p (p.key)}
					{#if p.type === 'ellipsis'}
						<Pagination.Item>
							<Pagination.Ellipsis />
						</Pagination.Item>
					{:else if p.value > 0}
						<Pagination.Item>
							<Pagination.Link page={p} isActive={page === p.value}>
								{p.value}
							</Pagination.Link>
						</Pagination.Item>
					{/if}
				{/each}
				<Pagination.Item>
					<IconButton
						icon={ChevronRight}
						label="Sonraki sayfa"
						onclick={onIncrement}
						disabled={page >= Math.ceil(count / perPage)}
						variant="ghost" />
				</Pagination.Item>
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>
</div>
