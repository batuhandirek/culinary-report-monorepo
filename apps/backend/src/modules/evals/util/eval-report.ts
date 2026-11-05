import _ from 'lodash';

import type { EvalCaseKind } from '../interfaces/eval-case.interface.js';

import { type Issue, rate, type Tally } from './eval-score.js';

/** What a scored run keeps (`scores.json`), and what the report compares runs by */
export interface RunScores {
	label: string;
	at: string;
	cases: Record<EvalCaseKind, number>;
	/** Cases without a reference or an output, left out */
	unscored: number;
	/** Sources the run got no answer for, scored as read into nothing */
	dropped?: number;
	byKind: Partial<Record<EvalCaseKind, Tally>>;
	/** The same per side (`splitOf`): a change tuned on train is judged on test */
	bySplit?: Record<'train' | 'test', Partial<Record<EvalCaseKind, Tally>>>;
	/** Headline metrics per case tag ("lang:de", "platform:blog") */
	byTag: Record<string, Tally>;
	/** The models that answered the run's agents, with how many cases each */
	models: Record<string, Record<string, number>>;
	tokens: number;
	/** Of `tokens`, the input tokens served from the provider's prompt cache */
	cachedTokens?: number;
	/** Dollars the run's paid calls cost (a classifier's) */
	usd?: number;
	/** How the run read its sources (`run.json`): reader, models, labeller, whose claims */
	reading?: Record<string, unknown>;
	/** References older than the agents' current instructions */
	staleReferences: number;
	/** The scores once the rulings forgive what they found not to be the agent's error (`adjudicate`) */
	adjusted?: { cases: number; byKind: Partial<Record<EvalCaseKind, Tally>> };
}

/** What each metric says, in the order the report lists them */
export const METRICS: { key: string; label: string }[] = [
	{ key: 'claims.recall', label: 'Claims found (of the reference)' },
	{ key: 'claims.precision', label: 'Claims that are real (of produced)' },
	{ key: 'parts.sentiment', label: 'Sentiment' },
	{ key: 'parts.aspect', label: 'Aspect, exact' },
	{ key: 'parts.aspect_root', label: 'Aspect, right root' },
	{ key: 'shortlist.recall', label: "Aspect: the reference's among those offered (shortlist)" },
	{ key: 'parts.kind', label: 'Kind' },
	{ key: 'parts.kind_read', label: 'Kind given at all' },
	{ key: 'sure.sentiment', label: 'Sentiment: sure answers (p ≥ 0.9, of answered)' },
	{ key: 'parts.sentiment@sure', label: 'Sentiment, among sure answers' },
	{ key: 'sure.aspect', label: 'Aspect: sure answers (p ≥ 0.9, of answered)' },
	{ key: 'parts.aspect@sure', label: 'Aspect, exact, among sure answers' },
	{ key: 'sure.kind', label: 'Kind: sure answers (p ≥ 0.9, of answered)' },
	{ key: 'parts.kind@sure', label: 'Kind, among sure answers' },
	{ key: 'change.precision', label: 'Changes that are changes' },
	{ key: 'change.recall', label: 'Changes found' },
	{ key: 'parts.amount', label: 'Amount' },
	{ key: 'parts.foods_precision', label: 'Foods named, precision' },
	{ key: 'parts.foods_recall', label: 'Foods named, recall' },
	{ key: 'claims.subject', label: 'Subject (place, city, none)' },
	{ key: 'claims.place', label: 'Claim on the right place' },
	{ key: 'places.recall', label: 'Places found' },
	{ key: 'places.precision', label: 'Places that are places' },
	{ key: 'match.brand', label: 'Match: brand (found places)' },
	{ key: 'match.branch', label: 'Match: branch (right brand)' },
	{ key: 'match_isolated.brand', label: "Match on the reference's places: brand" },
	{ key: 'match_isolated.branch', label: "Match on the reference's places: branch" },
	{ key: 'post.promotional', label: 'Promotional flag' },
	{ key: 'terms.exact', label: 'Wording: topics exactly right' },
	{ key: 'terms.precision', label: 'Wording: topics right (of produced)' },
	{ key: 'terms.recall', label: 'Wording: topics found' },
	{ key: 'terms.first', label: 'Wording: first topic' },
	{ key: 'terms.relation', label: 'Wording: relation' },
	{ key: 'terms.none', label: 'Wording: none when none' },
	{ key: 'terms.linked', label: 'Wording: linked when it should be' },
];

/** Metrics the per-tag table shows */
export const TAG_METRICS = [
	'claims.recall',
	'claims.precision',
	'parts.aspect',
	'parts.sentiment',
	'places.recall',
	'match.brand',
];

const KIND_TITLES: Record<EvalCaseKind, string> = {
	review: 'Reviews',
	post: 'Posts and articles',
	term: 'Wordings',
};

const pct = (t: [number, number] | undefined) => {
	const r = t ? rate(t) : null;
	return r === null ? '—' : `${Math.round(r * 100)}%`;
};
const cell = (t: [number, number] | undefined) => (t && t[1] ? `${pct(t)} (${t[0]}/${t[1]})` : '—');
const delta = (a: [number, number] | undefined, b: [number, number] | undefined) => {
	const ra = a ? rate(a) : null;
	const rb = b ? rate(b) : null;
	if (ra === null || rb === null) return '';
	const d = Math.round((ra - rb) * 100);
	return (
		d === 0 ? ' ±0'
		: d > 0 ? ` +${d}`
		: ` ${d}`
	);
};
// Case text goes into the report as text, never as markdown: pipes and backticks would break a table
const escape = (s: string) => s.replace(/[|`<>]/g, c => `\\${c}`).replace(/\n/g, ' ');

/**
 * A run's report (`report.md`): its scores beside the stored data's and the earlier runs', per kind
 * of case, a per-tag table, then every miss grouped by metric (`MAX_ISSUES` each; all of them are
 * in `issues.jsonl`).
 */
export const renderReport = (
	run: RunScores,
	others: RunScores[],
	issues: Issue[],
	maxIssues = 40,
): string => {
	const lines: string[] = [];
	const compare = others.filter(o => o.label !== run.label);
	lines.push(`# Ingestion eval: ${run.label}`, '');
	lines.push(
		`${run.at.slice(0, 16).replace('T', ' ')} UTC · ${run.cases.review} reviews, ${run.cases.post} posts, ${run.cases.term} wordings` +
			(run.unscored ? ` · ${run.unscored} cases left out (no reference or no output)` : '') +
			(run.dropped ?
				` · ${run.dropped} sources dropped by the agents (scored as nothing read)`
			:	''),
	);
	if (run.reading)
		lines.push(
			`Reading: ${Object.entries(run.reading)
				.map(([k, v]) => `${k} ${String(v)}`)
				.join(', ')}`,
		);
	if (run.tokens)
		lines.push(
			`Tokens: ${run.tokens.toLocaleString('en')}` +
				(run.cachedTokens ?
					` (${run.cachedTokens.toLocaleString('en')} input tokens from the prompt cache)`
				:	''),
		);
	if (run.usd) lines.push(`Spend: $${run.usd.toFixed(3)} (paid calls: classifiers)`);
	if (run.reading?.claims === 'reference')
		lines.push(
			'',
			"> The claims are the reference's own (`--claims reference`): only their labels were read, so only the parts are scored.",
		);
	const models = Object.entries(run.models)
		.map(
			([agent, m]) =>
				`${agent}: ${Object.entries(m)
					.map(([id, n]) => `${id} (${n})`)
					.join(', ')}`,
		)
		.join('; ');
	if (models) lines.push(`Models: ${models}`);
	if (run.adjusted)
		lines.push(
			'',
			`> ${run.adjusted.cases} cases are ruled (adjudicate): "after rulings" counts a miss Opus found to be the reference's error, or a reading both allow, as right.`,
		);
	if (run.staleReferences)
		lines.push(
			'',
			`> ${run.staleReferences} references were written against older instructions than the agents have now: where the rules changed, they score the old rules.`,
		);
	lines.push('');

	for (const kind of ['review', 'post', 'term'] as EvalCaseKind[]) {
		const tally = run.byKind[kind];
		if (!tally || !Object.keys(tally).length) continue;
		lines.push(`## ${KIND_TITLES[kind]}`, '');
		const adjusted = run.adjusted?.byKind[kind];
		const header = [
			'Metric',
			run.label,
			...(adjusted ? ['after rulings'] : []),
			...compare.map(o => o.label),
		];
		lines.push(`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`);
		for (const m of METRICS) {
			if (!tally[m.key]) continue;
			const row = [
				m.label,
				cell(tally[m.key]),
				...(adjusted ? [pct(adjusted[m.key])] : []),
				...compare.map(
					o =>
						`${pct(o.byKind[kind]?.[m.key])}${delta(tally[m.key], o.byKind[kind]?.[m.key])}`,
				),
			];
			lines.push(`| ${row.join(' | ')} |`);
		}
		lines.push('');
	}
	if (compare.length)
		lines.push(
			'_Other runs show their share and the points this run is above (+) or below (−) it._',
			'',
		);

	if (run.bySplit) {
		lines.push(
			'## Held-back cases',
			'',
			'_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._',
			'',
		);
		const withSplit = compare.filter(o => o.bySplit);
		const header = [
			'Metric',
			`${run.label} (train)`,
			`${run.label} (test)`,
			...withSplit.map(o => `${o.label} (test)`),
		];
		for (const kind of ['review', 'post', 'term'] as EvalCaseKind[]) {
			const test = run.bySplit.test[kind];
			if (!test || !Object.keys(test).length) continue;
			lines.push(`### ${KIND_TITLES[kind]}`, '');
			lines.push(`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`);
			for (const m of METRICS) {
				if (!test[m.key]) continue;
				lines.push(
					`| ${[
						m.label,
						pct(run.bySplit.train[kind]?.[m.key]),
						cell(test[m.key]),
						...withSplit.map(
							o =>
								`${pct(o.bySplit!.test[kind]?.[m.key])}${delta(test[m.key], o.bySplit!.test[kind]?.[m.key])}`,
						),
					].join(' | ')} |`,
				);
			}
			lines.push('');
		}
	}

	const tags = Object.keys(run.byTag).sort();
	if (tags.length) {
		lines.push('## By case tag', '');
		lines.push(
			`| Tag | ${TAG_METRICS.map(m => METRICS.find(x => x.key === m)!.label).join(' | ')} |`,
		);
		lines.push(`|---|${TAG_METRICS.map(() => '---|').join('')}`);
		for (const tag of tags)
			lines.push(`| ${tag} | ${TAG_METRICS.map(m => cell(run.byTag[tag][m])).join(' | ')} |`);
		lines.push('');
	}

	lines.push('## Misses', '');
	for (const [metric, group] of Object.entries(_.groupBy(issues, i => i.metric)).sort(
		(a, b) => b[1].length - a[1].length,
	)) {
		lines.push(`### ${metric} (${group.length})`, '');
		for (const issue of group.slice(0, maxIssues))
			lines.push(`- \`${issue.caseId}\` ${escape(issue.detail)}`);
		if (group.length > maxIssues)
			lines.push(`- … ${group.length - maxIssues} more in issues.jsonl`);
		lines.push('');
	}
	return lines.join('\n');
};
