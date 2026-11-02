<script lang="ts">
	import type { AdminDigestionStatementOutputDto } from 'client';

	import { sentimentVariant } from '#lib/culinary.js';
	import { quoteFound } from '#lib/digestion.js';
	import { amountLabel, aspectOf, foodPartsOf, KIND_LABELS } from '#lib/statements.js';
	import { topicHref } from '#lib/topic-format.js';
	import Badge from '#ui/wrapped/Badge.svelte';

	// A source's claims as agent A split them, and what agent B read in each: sentiment, kind,
	// aspect, the food wordings with the topics each is linked to, and the number it states. A
	// claim B has not read yet says so; a quote is marked when it is in the source's text.
	interface Props {
		statements: AdminDigestionStatementOutputDto[];
		/** The source's texts, for checking each quote against */
		texts: (string | undefined)[];
		/** Who or what a claim is about, as the source names it */
		aboutOf: (statement: AdminDigestionStatementOutputDto) => { label: string; href?: string; muted?: boolean };
	}

	let { statements, texts, aboutOf }: Props = $props();
</script>

{#if statements.length}
	<div class="border-line bg-paper overflow-x-auto rounded-md border">
		<table class="w-full border-separate border-spacing-0 text-[0.8125rem] leading-5">
			<thead>
				<tr class="text-muted-foreground text-left text-xs">
					{#each ['Claim', 'In their words', 'About', 'Sentiment', 'Kind', 'Aspect', 'Foods → topics', 'Number'] as heading (heading)}
						<th class="border-line border-b px-3 py-1.5 font-semibold whitespace-nowrap">{heading}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each statements as statement (statement.id)}
					{@const about = aboutOf(statement)}
					{@const aspect = aspectOf(statement)}
					{@const foods = foodPartsOf(statement)}
					{@const read = !!statement.partsAt}
					<tr class="align-top [&:last-child>td]:border-b-0">
						<td class="border-line min-w-56 border-b px-3 py-2">
							{#if statement.text}
								{statement.text}
							{:else}
								<span class="text-muted-foreground italic">named a dish</span>
							{/if}
						</td>
						<td class="border-line min-w-40 border-b px-3 py-2">
							{#if statement.quote}
								{#if quoteFound(statement.quote, texts)}
									<mark class="bg-primary/40 text-ink rounded-sm" title="Found in the source's text">“{statement.quote}”</mark>
								{:else}
									<span class="text-muted-foreground" title="Not found in the source's text">“{statement.quote}”</span>
								{/if}
							{:else}
								<span class="text-faint">—</span>
							{/if}
						</td>
						<td class="border-line border-b px-3 py-2 whitespace-nowrap">
							{#if about.href}
								<a href={about.href} class="font-medium underline-offset-4 hover:underline">{about.label}</a>
							{:else}
								<span class={about.muted ? 'text-muted-foreground' : ''}>{about.label}</span>
							{/if}
						</td>
						{#if read}
							<td class="border-line border-b px-3 py-2">
								{#if statement.sentiment}
									<Badge variant={sentimentVariant(statement.sentiment)}>{statement.sentiment}</Badge>
								{:else}
									<span class="text-faint">—</span>
								{/if}
							</td>
							<td class="border-line border-b px-3 py-2">
								{#if statement.kind}
									<Badge variant={statement.kind === 'change' || statement.kind === 'new_item' || statement.kind === 'deal' ? 'warning' : 'quiet'}>
										{KIND_LABELS[statement.kind] ?? statement.kind}
									</Badge>
								{:else}
									<span class="text-faint">—</span>
								{/if}
							</td>
							<td class="border-line border-b px-3 py-2 whitespace-nowrap">
								{#if aspect}
									<a href={topicHref(aspect.key)} class="underline-offset-4 hover:underline">
										{aspect.root !== aspect.key ? `${aspect.rootLabel} › ${aspect.label}` : aspect.label}
									</a>
								{:else}
									<span class="text-muted-foreground">no aspect</span>
								{/if}
							</td>
							<td class="border-line border-b px-3 py-2">
								{#if foods.length}
									<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
										{#each foods as food (food.key)}
											<li class="whitespace-nowrap">
												<span class="font-medium">{food.name}</span>
												<span class="text-faint">→</span>
												{#if food.topics.length}
													{#each food.topics as topic, i (topic.key)}{#if i}, {/if}<a
															href={topicHref(topic.key)}
															class="text-beet underline-offset-2 hover:underline">{topic.label}</a
														>{/each}
												{:else}
													<span class="text-muted-foreground">not linked yet</span>
												{/if}
											</li>
										{/each}
									</ul>
								{:else}
									<span class="text-faint">—</span>
								{/if}
							</td>
							<td class="border-line border-b px-3 py-2 text-right whitespace-nowrap tabular-nums">
								{#if statement.amount != null && statement.unit}
									{amountLabel(statement.amount, statement.unit)}
								{:else}
									<span class="text-faint">—</span>
								{/if}
							</td>
						{:else}
							<td colspan="5" class="border-line text-muted-foreground border-b px-3 py-2">Not read by agent B yet.</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<p class="text-muted-foreground m-0 text-sm">Agent A found no claims in it.</p>
{/if}
