<script lang="ts">
	import { ArrowUp, X } from '@lucide/svelte';
	import type { AnalystMentionType } from 'sdk';

	import { api } from '#lib/api.js';
	import Button from '#ui/wrapped/Button.svelte';

	interface Found {
		type: AnalystMentionType;
		id: string;
		ref: string;
		label: string;
		detail?: string;
		token: string;
	}

	interface Props {
		/** The last answer is still being written (a follow-up waits) */
		busy: boolean;
		sending: boolean;
		/** Answers whether it was taken; the text clears then */
		onSubmit: (text: string) => Promise<boolean>;
		placeholder?: string;
		/** Set from outside (an example question) */
		value?: string;
	}

	let { busy, sending, onSubmit, placeholder = 'Ask about the data… type @ to name a brand, branch, aspect or topic', value = $bindable('') }: Props = $props();

	const TYPE_LABELS: Record<AnalystMentionType, string> = {
		venue: 'Branch',
		brand: 'Brand',
		aspect: 'Aspect',
		topic: 'Food',
		term: 'Wording',
		city: 'City',
		creator: 'Creator',
		post: 'Post'
	};

	let textarea = $state<HTMLTextAreaElement>();
	let query = $state<string | null>(null);
	let items = $state<Found[]>([]);
	let active = $state(0);
	let searching = $state(false);
	// The labels of what was picked, for the chips under the box
	let picked = $state<Record<string, Found>>({});
	let timer: ReturnType<typeof setTimeout> | undefined;
	let asked = 0;

	const tokens = $derived(Object.values(picked).filter((f) => value.includes(f.token)));

	/** The `@word` being typed before the caret, if any */
	const triggerAt = () => {
		if (!textarea) return null;
		const before = value.slice(0, textarea.selectionStart ?? value.length);
		const match = before.match(/(?:^|\s)@([^\s@:]{1,40})$/);
		return match ? match[1] : null;
	};

	const search = (q: string) => {
		clearTimeout(timer);
		timer = setTimeout(async () => {
			const mine = ++asked;
			searching = true;
			try {
				const res = await api.admin.searchAnalystMentions({ q });
				if (mine !== asked) return;
				items = res.items as unknown as Found[];
				active = 0;
			} catch {
				if (mine === asked) items = [];
			} finally {
				if (mine === asked) searching = false;
			}
		}, 200);
	};

	const onInput = () => {
		const q = triggerAt();
		query = q;
		if (q && q.length >= 2) search(q);
		else items = [];
	};

	const close = () => {
		query = null;
		items = [];
	};

	const choose = (item: Found) => {
		if (!textarea || query === null) return;
		const caret = textarea.selectionStart ?? value.length;
		const start = caret - query.length - 1;
		value = `${value.slice(0, start)}${item.token} ${value.slice(caret)}`;
		picked = { ...picked, [item.token]: item };
		close();
		const at = start + item.token.length + 1;
		requestAnimationFrame(() => {
			textarea?.focus();
			textarea?.setSelectionRange(at, at);
		});
	};

	const unpick = (token: string) => {
		value = value.replaceAll(`${token} `, '').replaceAll(token, '').replace(/\s{2,}/g, ' ');
	};

	const submit = async () => {
		const text = value.trim();
		if (!text || busy || sending) return;
		if (await onSubmit(text)) value = '';
	};

	const onKeydown = (e: KeyboardEvent) => {
		if (items.length && query !== null) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				active = (active + 1) % items.length;
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				active = (active - 1 + items.length) % items.length;
				return;
			}
			if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				choose(items[active]);
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
				return;
			}
		}
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			void submit();
		}
	};
</script>

<div class="relative rounded-md border border-line bg-paper p-2 focus-within:border-ink">
	{#if query !== null && (items.length || searching)}
		<ul
			class="absolute right-2 bottom-full left-2 z-20 mb-1 max-h-72 overflow-auto rounded-md border border-line bg-paper py-1 shadow-md"
			role="listbox"
			aria-label="Rows to name">
			{#if searching && !items.length}
				<li class="px-3 py-2 text-xs text-muted-foreground">Searching…</li>
			{/if}
			{#each items as item, i (item.type + item.id)}
				<li role="option" aria-selected={i === active}>
					<button
						type="button"
						class={['flex min-h-10 w-full items-center gap-2 px-3 py-1.5 text-left text-sm', i === active ? 'bg-tint' : 'hover:bg-wash']}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => choose(item)}>
						<span class="w-16 shrink-0 text-xs text-muted-foreground">{TYPE_LABELS[item.type]}</span>
						<span class="min-w-0 flex-1 truncate text-ink">{item.label}</span>
						{#if item.detail}<span class="max-w-[45%] shrink-0 truncate text-xs text-muted-foreground">{item.detail}</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<textarea
		bind:this={textarea}
		bind:value
		rows="2"
		{placeholder}
		aria-label="Question"
		class="block max-h-60 min-h-12 w-full resize-y border-0 bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-muted-foreground"
		oninput={onInput}
		onkeydown={onKeydown}
		onblur={() => setTimeout(close, 150)}></textarea>

	<div class="flex items-center gap-2 pt-1">
		<div class="flex min-w-0 flex-1 flex-wrap gap-1">
			{#each tokens as t (t.token)}
				<span class="inline-flex items-center gap-1 rounded-full border border-line bg-wash py-0.5 pr-1 pl-2 text-xs text-ink">
					<span class="text-muted-foreground">{TYPE_LABELS[t.type]}</span>{t.label}
					<button type="button" class="rounded-full p-0.5 hover:bg-line" aria-label={`Remove ${t.label}`} onclick={() => unpick(t.token)}>
						<X class="size-3" />
					</button>
				</span>
			{/each}
			{#if busy}
				<span class="text-xs text-muted-foreground">The analyst is answering; ask the next one when it is done.</span>
			{/if}
		</div>
		<Button size="sm" icon={ArrowUp} loading={sending} disabled={busy || !value.trim()} onclick={submit}>Ask</Button>
	</div>
</div>
