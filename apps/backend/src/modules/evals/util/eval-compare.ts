import type { EvalCaseKind } from '../interfaces/eval-case.interface.js';

import { type EvalSplit, splitOf } from './eval-sample.js';
import type { Tally } from './eval-score.js';

/** Per case, its kind and its tally: what a scored run keeps beside its totals (`cases.json`) */
export type CaseTallies = Record<string, { kind: EvalCaseKind; tags?: string[]; tally: Tally }>;

/** One metric of one kind, a candidate run against a base run */
export interface CompareRow {
	kind: EvalCaseKind;
	metric: string;
	base: number;
	candidate: number;
	/** Candidate minus base, in points */
	delta: number;
	/**
	 * Points a difference must pass to count: the larger of the bootstrap's half-width over cases
	 * (95% for the goal, 99% for the rest: thirty metrics at 95% flag one or two by chance) and twice
	 * the gap between two runs of the same prompts (`noise`), `MIN_THRESHOLD` at least
	 */
	threshold: number;
	verdict: 'better' | 'worse' | 'same';
	/** Cases in both runs that count for the metric */
	cases: number;
}

/** Resamples of the paired bootstrap */
export const BOOTSTRAP_ROUNDS = 1000;
/** No change under this many points counts, however calm the runs */
export const MIN_THRESHOLD = 1;

// A seeded generator, so a comparison is the same each time it is printed
const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pooled = (ids: string[], of: CaseTallies, metric: string) => {
	let r = 0;
	let o = 0;
	for (const id of ids) {
		const t = of[id]?.tally[metric];
		if (t) {
			r += t[0];
			o += t[1];
		}
	}
	return o ? r / o : null;
};

/**
 * A candidate run against a base on the cases both scored, on one split (test by default: the
 * cases never read while tuning), per kind and metric: the pooled rates, the difference, and
 * whether it passes the threshold (`CompareRow.threshold`). `noise` is two runs of the same prompts;
 * without it only the bootstrap counts.
 */
export const compareRuns = (
	base: CaseTallies,
	candidate: CaseTallies,
	opts: {
		/** Two runs of the same prompts: how far a metric moves with nothing changed */
		noise?: [CaseTallies, CaseTallies];
		split?: EvalSplit | 'all';
		/** Only the cases with this tag (`size:large`, `platform:blog`) */
		tag?: string;
		rounds?: number;
		goal?: { kind: EvalCaseKind; metric: string };
	} = {},
): CompareRow[] => {
	const split = opts.split ?? 'test';
	const rounds = opts.rounds ?? BOOTSTRAP_ROUNDS;
	const shared = Object.keys(base).filter(
		id =>
			candidate[id] &&
			(split === 'all' || splitOf(id) === split) &&
			(!opts.tag || !!base[id].tags?.includes(opts.tag)),
	);
	const rows: CompareRow[] = [];
	for (const kind of ['review', 'post', 'term'] as EvalCaseKind[]) {
		const ids = shared.filter(id => base[id].kind === kind);
		const metrics = new Set(ids.flatMap(id => Object.keys(base[id].tally)));
		for (const metric of [...metrics].sort()) {
			const counted = ids.filter(id => base[id].tally[metric] || candidate[id].tally[metric]);
			const b = pooled(counted, base, metric);
			const c = pooled(counted, candidate, metric);
			if (b === null || c === null) continue;
			const random = mulberry32(counted.length * 7919 + metric.length);
			const deltas: number[] = [];
			for (let k = 0; k < rounds; k++) {
				const sample = counted.map(() => counted[Math.floor(random() * counted.length)]);
				const sb = pooled(sample, base, metric);
				const sc = pooled(sample, candidate, metric);
				if (sb !== null && sc !== null) deltas.push(sc - sb);
			}
			deltas.sort((x, y) => x - y);
			const isGoal = opts.goal?.kind === kind && opts.goal.metric === metric;
			const tail = isGoal ? 0.025 : 0.005;
			const lo = deltas[Math.floor(deltas.length * tail)] ?? 0;
			const hi = deltas[Math.ceil(deltas.length * (1 - tail)) - 1] ?? 0;
			const delta = c - b;
			const halfWidth = (hi - lo) / 2;
			const n1 = opts.noise ? pooled(counted, opts.noise[0], metric) : null;
			const n2 = opts.noise ? pooled(counted, opts.noise[1], metric) : null;
			const threshold = Math.max(
				halfWidth * 100,
				n1 !== null && n2 !== null ? 2 * Math.abs(n1 - n2) * 100 : 0,
				MIN_THRESHOLD,
			);
			const points = delta * 100;
			rows.push({
				kind,
				metric,
				base: b * 100,
				candidate: c * 100,
				delta: points,
				threshold,
				verdict:
					points > threshold ? 'better'
					: points < -threshold ? 'worse'
					: 'same',
				cases: counted.length,
			});
		}
	}
	return rows;
};

/** The comparison as a markdown table, the goal's row first, then every row that moved */
export const renderCompare = (
	rows: CompareRow[],
	labels: { base: string; candidate: string; noise?: string; split: string; tag?: string },
	goal?: { kind: EvalCaseKind; metric: string },
): string => {
	const fmt = (x: number) => x.toFixed(1);
	const line = (r: CompareRow) =>
		`| ${r.kind} | ${r.metric} | ${fmt(r.base)} | ${fmt(r.candidate)} | ${r.delta >= 0 ? '+' : ''}${fmt(r.delta)} | ±${fmt(r.threshold)} | ${r.verdict} | ${r.cases} |`;
	const head = [
		`# ${labels.candidate} against ${labels.base} (${labels.split} cases${labels.tag ? ` tagged ${labels.tag}` : ''}${labels.noise ? `, noise from ${labels.noise}` : ''})`,
		'',
		'| Kind | Metric | Base | Candidate | Δ points | Must pass | Verdict | Cases |',
		'|---|---|---|---|---|---|---|---|',
	];
	const goalRow = goal && rows.find(r => r.kind === goal.kind && r.metric === goal.metric);
	const worse = rows.filter(r => r.verdict === 'worse');
	const better = rows.filter(r => r.verdict === 'better');
	const lines = [...head];
	if (goalRow) lines.push(line(goalRow));
	for (const r of [...worse, ...better]) if (r !== goalRow) lines.push(line(r));
	lines.push(
		'',
		`Verdict: ${goalRow ? `goal ${goal!.kind}:${goal!.metric} ${goalRow.verdict}; ` : ''}${better.length} better, ${worse.length} worse${worse.length ? ` (${worse.map(r => `${r.kind}:${r.metric}`).join(', ')})` : ''}, ${rows.length - better.length - worse.length} within the threshold.`,
	);
	return lines.join('\n');
};
