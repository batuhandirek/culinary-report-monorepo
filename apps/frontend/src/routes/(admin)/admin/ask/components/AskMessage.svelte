<script lang="ts" module>
	import type { AnalystMention, AnalystMessagePayload, AnalystPartPayload } from 'sdk';

	import { aspectPageHref, topicHref } from '#lib/topic-format.js';

	/** Where a mentioned row lives in the admin */
	export const mentionHref = (m: AnalystMention): string | undefined => {
		if (!m.found || !m.id) return undefined;
		switch (m.type) {
			case 'venue':
				return `/admin/venues/${m.id}`;
			case 'brand':
				return `/admin/brands/${m.id}`;
			case 'aspect':
			case 'topic': {
				// A topic's page is by key; a mention by id has no key to hand
				if (/^[0-9a-f-]{36}$/i.test(m.ref)) return undefined;
				return m.type === 'aspect' ? aspectPageHref(m.ref) : topicHref(m.ref);
			}
			case 'creator':
				return `/admin/creators/${m.id}`;
			case 'post':
				return `/admin/posts/${m.id}`;
			case 'city':
				return `/admin/cities/${m.id}`;
			default:
				return undefined;
		}
	};

	const TOKEN = /@([A-Za-z]+):([A-Za-z0-9_-]+)/g;

	type Piece = { text: string } | { mention: AnalystMention; token: string };

	/** A question's text in pieces: plain text and the mentions it names */
	export const questionPieces = (text: string, mentions: AnalystMention[]): Piece[] => {
		const pieces: Piece[] = [];
		let last = 0;
		for (const match of text.matchAll(TOKEN)) {
			const ref = match[2].replace(/-+$/, '');
			const mention = mentions.find((m) => m.ref === ref);
			if (!mention || match.index === undefined) continue;
			const token = `@${match[1]}:${ref}`;
			pieces.push({ text: text.slice(last, match.index) });
			pieces.push({ mention, token });
			last = match.index + token.length;
		}
		pieces.push({ text: text.slice(last) });
		return pieces;
	};

	/** An answer's parts sorted into the plan, the steps, the answer's text, the shown results, errors */
	export const answerSections = (parts: AnalystPartPayload[]) => {
		const sorted = [...parts].sort((a, b) => a.position - b.position);
		const plan = sorted.find((p) => p.data.type === 'plan');
		let lastTool = -1;
		sorted.forEach((p, i) => {
			if (p.data.type === 'query' || p.data.type === 'lookup' || p.data.type === 'plan') lastTool = i;
		});
		const steps = sorted.slice(0, lastTool + 1).filter((p) => p.data.type !== 'plan' && p.data.type !== 'error');
		const answer = sorted.slice(lastTool + 1).filter((p) => p.data.type === 'text');
		const shown = sorted.filter((p) => p.data.type === 'query' && p.data.show && !p.data.error && p.data.rows);
		const errors = sorted.filter((p) => p.data.type === 'error');
		return { plan, steps, answer, shown, errors };
	};
</script>

<script lang="ts">
	import { Check, Circle, CircleDot, Search, Sparkles, X } from '@lucide/svelte';

	import AskMarkdown from './AskMarkdown.svelte';
	import AskQuery from './AskQuery.svelte';
	import AskResult from './AskResult.svelte';

	import { ago } from '#components/admin/admin-format.js';
	import Spinner from '#ui/components/Spinner.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';

	interface Props {
		message: AnalystMessagePayload;
	}

	let { message }: Props = $props();

	const fromAnalyst = $derived(message.author.roles.includes('system'));
	const working = $derived(message.status === 'queued' || message.status === 'running');
	const sections = $derived(answerSections(message.parts));
	// Open while the answer is written, folded once it is done, unless the admin chose
	let stepsOpen = $state<boolean | null>(null);
	const showSteps = $derived(stepsOpen ?? working);

	const questionText = $derived(
		message.parts.map((p) => (p.data.type === 'text' ? p.data.text : '')).filter(Boolean).join('\n\n')
	);
	const mentions = $derived(message.parts.flatMap((p) => (p.data.type === 'mentions' ? p.data.mentions : [])));
	const stepCount = $derived(sections.steps.filter((p) => p.data.type !== 'text').length);
	const usd = $derived(message.usd ? (message.usd < 0.01 ? '<$0.01' : `$${message.usd.toFixed(2)}`) : null);
	const model = $derived(message.model?.split('/').pop());
</script>

{#if !fromAnalyst}
	<div class="flex flex-col items-end gap-1">
		<div class="max-w-[85%] rounded-md bg-tint px-3 py-2 text-sm whitespace-pre-wrap text-ink">
			{#each questionPieces(questionText, mentions) as piece, i (i)}
				{#if 'text' in piece}{piece.text}{:else}
					{@const href = mentionHref(piece.mention)}
					<a
						{href}
						class={[
							'mx-0.5 inline-flex items-baseline rounded-full border px-1.5 text-xs font-medium no-underline',
							piece.mention.found ? 'border-line bg-paper text-ink hover:border-ink' : 'border-chili text-chili'
						]}
						title={piece.mention.found ? piece.mention.facts : `No such ${piece.mention.type}`}>
						{piece.mention.label ?? piece.token}
					</a>
				{/if}
			{/each}
		</div>
		<span class="text-xs text-muted-foreground">{message.author.firstName} · {ago(message.createdAt)}</span>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<Sparkles class="size-4 text-primary-darker" />
			<span class="font-semibold text-ink">Analyst</span>
			{#if message.status === 'queued'}
				<span class="flex items-center gap-1"><Spinner size={12} label="" /> waiting for its turn</span>
			{:else if message.status === 'running'}
				<span class="flex items-center gap-1"><Spinner size={12} label="" /> working</span>
			{:else}
				<span>{[model, usd, ago(message.finishedAt ?? message.createdAt)].filter(Boolean).join(' · ')}</span>
			{/if}
		</div>

		{#if sections.plan && sections.plan.data.type === 'plan'}
			<ol class="flex flex-col gap-1 rounded-md border border-line bg-paper px-3 py-2 text-sm">
				{#each sections.plan.data.steps as step, i (i)}
					<li class={['flex items-start gap-2', step.status === 'skipped' && 'text-muted-foreground line-through']}>
						{#if step.status === 'done'}
							<Check class="mt-0.5 size-4 shrink-0 text-primary-darker" />
						{:else if step.status === 'doing'}
							<CircleDot class="mt-0.5 size-4 shrink-0 text-grape" />
						{:else if step.status === 'skipped'}
							<X class="mt-0.5 size-4 shrink-0" />
						{:else}
							<Circle class="mt-0.5 size-4 shrink-0 text-faint" />
						{/if}
						<span>{step.title}</span>
					</li>
				{/each}
			</ol>
		{/if}

		{#if sections.steps.length}
			<div class="flex flex-col gap-1.5">
				<button
					type="button"
					class="self-start text-xs font-medium text-grape hover:underline"
					aria-expanded={showSteps}
					onclick={() => (stepsOpen = !showSteps)}>
					{showSteps ? 'Hide' : 'Show'}
					{stepCount} step{stepCount === 1 ? '' : 's'}
				</button>
				{#if showSteps}
					<div class="flex flex-col gap-1.5 border-l-2 border-line pl-3">
						{#each sections.steps as part (part.id)}
							{#if part.data.type === 'text'}
								<p class="m-0 text-sm text-muted-foreground">{part.data.text}</p>
							{:else if part.data.type === 'query'}
								<AskQuery data={part.data} running={part.streaming} />
							{:else if part.data.type === 'lookup'}
								<div class="flex items-center gap-2 px-1 text-xs text-muted-foreground">
									{#if part.streaming}<Spinner size={12} label="" />{:else}<Search class="size-3.5" />{/if}
									<span class="truncate">
										{part.data.tool === 'schema' ? 'Schema' : 'Find'}: {part.data.error ?? part.data.summary ?? '…'}
									</span>
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#each sections.answer as part (part.id)}
			{#if part.data.type === 'text'}
				<AskMarkdown text={part.data.text} streaming={part.streaming} />
			{/if}
		{/each}

		{#each sections.shown as part (part.id)}
			{#if part.data.type === 'query'}
				<AskResult data={part.data} />
			{/if}
		{/each}

		{#each sections.errors as part (part.id)}
			{#if part.data.type === 'error'}
				<Notice tone="danger" size="sm" text={part.data.message} />
			{/if}
		{/each}
	</div>
{/if}
