<script lang="ts">
	import { Search, X } from '@lucide/svelte';

	import { onDestroy, untrack } from 'svelte';

	import type { PaginatedDataTableTextFilterProps } from './types';

	import { cn } from '#ui/lib/utils.js';

	let {
		value,
		onChange,
		placeholder = 'Search…',
		submit = false,
		class: className = ''
	}: PaginatedDataTableTextFilterProps = $props();

	// What is typed, ahead of what is applied: the list refetches once typing pauses, or with
	// `submit` only on Enter or the Search button (each request costs something there).
	let draft = $state(value ?? '');
	let applied = $state(value ?? '');
	let timer: ReturnType<typeof setTimeout> | undefined;

	// The applied value can change under the field ("Clear all", the back button).
	$effect(() => {
		const incoming = value ?? '';
		untrack(() => {
			if (incoming === applied) return;
			applied = incoming;
			draft = incoming;
		});
	});

	const apply = () => {
		clearTimeout(timer);
		const next = draft.trim();
		if (next === applied) return;
		applied = next;
		onChange(next || undefined);
	};

	const schedule = () => {
		if (submit) return;
		clearTimeout(timer);
		timer = setTimeout(apply, 350);
	};
	// Typed but not applied yet: the Search button shows
	const pending = $derived(submit && draft.trim() !== '' && draft.trim() !== applied);

	const clear = () => {
		draft = '';
		apply();
	};

	onDestroy(() => clearTimeout(timer));
</script>

<label
	class={cn(
		'border-line bg-paper focus-within:border-ink/50 focus-within:ring-ring/40 flex h-8 w-full min-w-40 items-center gap-2 rounded-full border px-3 transition-colors focus-within:ring-2 sm:w-64',
		className
	)}>
	<Search class="text-muted-foreground size-3.5 shrink-0" />
	<input
		type="search"
		bind:value={draft}
		{placeholder}
		aria-label={placeholder}
		autocomplete="off"
		spellcheck="false"
		enterkeyhint="search"
		class="placeholder:text-muted-foreground min-w-0 flex-1 appearance-none bg-transparent text-xs outline-none [&::-webkit-search-cancel-button]:hidden"
		oninput={schedule}
		onkeydown={(e) => {
			if (e.key === 'Enter') apply();
			if (e.key === 'Escape' && draft) {
				e.stopPropagation();
				clear();
			}
		}} />
	{#if pending}
		<button
			type="button"
			class="bg-ink text-paper hover:bg-ink/85 -mr-1.5 h-6 shrink-0 rounded-full px-2.5 text-xs font-medium"
			onclick={apply}>Search</button>
	{:else if draft}
		<button
			type="button"
			class="text-muted-foreground hover:bg-ink/10 hover:text-ink -mr-1.5 grid size-6 shrink-0 place-items-center rounded-full"
			aria-label="Clear search"
			onclick={clear}>
			<X class="size-3.5" />
		</button>
	{/if}
</label>
