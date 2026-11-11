import type { Step } from './PipelineStrip.svelte';

import { atShort } from '#components/admin/admin-format.js';
import { SKIP_REASON_LABELS } from '#lib/culinary.js';

/** How a post's place was matched to a brand (`Mention.matchMethod`): the methods that settled one */
export const MATCHED_METHODS = new Set(['exact', 'fuzzy', 'llm', 'account', 'manual']);

/** The fields of a post the strip reads; the Digestion row's post and the post page's both fit */
interface PostForSteps {
	skipReason?: string;
	gatedAt?: string;
	analysedAt?: string;
	analysisTokens?: number;
	city: { name: string };
	mentions: { matchMethod?: string }[];
	statements: { partsAt?: string }[];
}

/**
 * How far the pipeline got with a post, step by step in the order they run: the gate, agent A's
 * places, matching, agent A's claims, and the claims the labeller read. A step that has nothing to
 * work on (no place, no claim) is left out.
 */
export const postSteps = (post: PostForSteps): Step[] => {
	const skipped = !!post.skipReason;
	const read = !!post.analysedAt && !skipped;
	const matched = post.mentions.filter((m) => m.matchMethod && MATCHED_METHODS.has(m.matchMethod)).length;
	const readByB = post.statements.filter((s) => s.partsAt).length;
	const steps: Step[] = [
		skipped
			? { label: 'Gate', state: 'skipped', result: SKIP_REASON_LABELS[post.skipReason!] ?? post.skipReason, hint: post.gatedAt && `judged ${atShort(post.gatedAt)}` }
			: post.gatedAt
				? { label: 'Gate', state: 'done', result: 'food', hint: `about eating or drinking out in ${post.city.name}; judged ${atShort(post.gatedAt)}` }
				: post.analysedAt
					? { label: 'Gate', state: 'partly', result: 'no verdict', hint: 'agent A read it before the gate judged it' }
					: { label: 'Gate', state: 'pending', hint: 'not judged yet' },
		{
			label: 'Places',
			state: read ? 'done' : 'pending',
			result: read ? String(post.mentions.length) : undefined,
			hint: read
				? `agent A, ${atShort(post.analysedAt!)}${post.analysisTokens ? ` · ${post.analysisTokens.toLocaleString('en-GB')} tokens` : ''}`
				: skipped
					? 'the gate skipped it'
					: 'not read by agent A yet'
		}
	];
	if (post.mentions.length)
		steps.push({
			label: 'Matched',
			state: matched === post.mentions.length ? 'done' : 'partly',
			result: `${matched} of ${post.mentions.length}`,
			hint: 'places matched to a brand'
		});
	steps.push({
		label: 'Claims',
		state: read || post.statements.length ? 'done' : 'pending',
		result: read || post.statements.length ? String(post.statements.length) : undefined,
		hint: 'split by agent A'
	});
	if (post.statements.length)
		steps.push({
			label: 'Parts',
			state: readByB === post.statements.length ? 'done' : readByB ? 'partly' : 'pending',
			result: `${readByB} of ${post.statements.length}`,
			hint: 'claims the labeller read: sentiment, kind, aspect'
		});
	return steps;
};
