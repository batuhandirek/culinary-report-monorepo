import _ from 'lodash';

import { CLAIM_LABELS } from 'src/modules/statements/util/claim-labels.js';
import { termKey } from 'src/modules/venues/util/dishes.js';

import type {
	EvalClaim,
	EvalMatch,
	EvalPlace,
	EvalPostClaim,
	EvalTermTopic,
	PostOutput,
	ReferenceClaim,
	ReferencePostClaim,
} from '../interfaces/eval-case.interface.js';

/** Per metric: [right, out of] */
export type Tally = Record<string, [number, number]>;

/** One thing a case got wrong, for the report's list of misses */
export interface Issue {
	caseId: string;
	metric: string;
	/** What the reference says against what was produced, short */
	detail: string;
	/** The reference's claim or place it is about, and the produced one (their indexes) */
	ref?: number;
	got?: number;
	/** The case's side (`splitOf`): only train misses are read while tuning */
	split?: 'train' | 'test';
}

export interface CaseScore {
	tally: Tally;
	issues: Issue[];
}

/** Pairs as [reference index, produced index] */
export type Pairs = [number, number][];

const add = (t: Tally, metric: string, right: number, outOf = 1) => {
	const [r, o] = t[metric] ?? [0, 0];
	t[metric] = [r + right, o + outOf];
};

export const mergeTallies = (tallies: Tally[]): Tally => {
	const out: Tally = {};
	for (const t of tallies) for (const [m, [r, o]] of Object.entries(t)) add(out, m, r, o);
	return out;
};

/**
 * The links the pairing gave, inside the lists and each once. A reference claim may link to
 * several produced ones (the agent split it) and a produced one to several references (it merged
 * them): the spec allows either granularity, so neither counts as a miss.
 */
export const validLinks = (pairs: Pairs, refCount: number, gotCount: number): Pairs =>
	_.uniqBy(
		pairs.filter(([r, g]) => r >= 0 && g >= 0 && r < refCount && g < gotCount),
		([r, g]) => `${r}:${g}`,
	);

/**
 * A classifier's answer this probable counts as sure: `sure.<label>` is the share of its answers
 * that are, `parts.<label>@sure` how often those are right. What a "send the unsure ones to a
 * second reader" threshold is read from.
 */
export const SURE_PROBABILITY = 0.9;

/** Pairs a list with itself, one to one: a run that labelled the reference's own claims */
export const identityPairs = (n: number): Pairs => _.range(n).map(i => [i, i] as [number, number]);

const short = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const foodKeys = (foods: string[] | null) => new Set((foods ?? []).map(termKey).filter(Boolean));
/**
 * Whether a food (its `termKey`) is among others: the same key, or one's words all in the other's
 * ("naan" and "naan bread", "frites" and "steak frites"): the references themselves cut a dish's
 * name at different lengths
 */
export const sameFood = (key: string, among: ReadonlySet<string>) => {
	if (among.has(key)) return true;
	const words = key.split(' ');
	return [...among].some(other => {
		const theirs = other.split(' ');
		return words.every(w => theirs.includes(w)) || theirs.every(w => words.includes(w));
	});
};
const sameAmount = (a: EvalClaim, b: EvalClaim) =>
	(a.amount === null && b.amount === null) ||
	(a.amount !== null &&
		b.amount !== null &&
		Math.abs(a.amount - b.amount) < 0.01 &&
		a.unit === b.unit);

/**
 * A source's claims against its reference's, over the links the pairing gave (`validLinks`: a
 * split or a merge is no miss): recall over the reference claims that are not optional (a linked
 * optional one is a hit, a missing one no miss), precision over the produced ones, and per link
 * the parts, each against the reference's answer or one it also accepts; a part agent B never gave
 * is counted unread (`parts.kind_read`), not wrong. A change is scored over every claim: a produced
 * change linked to no reference change is a false one.
 */
export const scoreClaims = (
	caseId: string,
	ref: ReferenceClaim[],
	got: EvalClaim[],
	pairs: Pairs,
	rootOf: (aspect: string) => string | undefined,
): CaseScore => {
	const tally: Tally = {};
	const issues: Issue[] = [];
	const ok = validLinks(pairs, ref.length, got.length);
	const linkedRef = new Set(ok.map(([r]) => r));
	const linkedGot = new Set(ok.map(([, g]) => g));

	for (const [i, r] of ref.entries()) {
		if (r.optional) continue;
		const hit = linkedRef.has(i);
		add(tally, 'claims.recall', hit ? 1 : 0);
		if (!hit) issues.push({ caseId, metric: 'claims.missed', ref: i, detail: short(r.text) });
	}
	for (const [j, g] of got.entries()) {
		const hit = linkedGot.has(j);
		add(tally, 'claims.precision', hit ? 1 : 0);
		if (!hit) issues.push({ caseId, metric: 'claims.extra', got: j, detail: short(g.text) });
	}

	const root = (a: string | null) => (a ? (rootOf(a) ?? a) : null);
	// The reference's kinds through the rule the pipeline stores by (`claimPartsOf`: a fact that
	// judges is an opinion): a fact it also lets judge accepts opinion, an opinion it also lets be
	// neutral accepts fact
	const acceptedKinds = (r: ReferenceClaim): (string | null)[] => {
		const kinds: (string | null)[] = [r.kind, ...r.alsoAcceptable.kinds];
		const sentiments = [r.sentiment, ...r.alsoAcceptable.sentiments];
		if (kinds.includes('fact') && sentiments.some(x => x !== 'neutral')) kinds.push('opinion');
		if (kinds.includes('opinion') && sentiments.includes('neutral')) kinds.push('fact');
		return kinds;
	};
	// One link's parts against the reference: null for a part agent B never gave (unread, not wrong)
	const judge = (r: ReferenceClaim, g: EvalClaim) => {
		const unread = g.sentiment === null && g.kind === null;
		const aspect =
			unread ? null : (
				g.aspect === r.aspect ||
				(g.aspect === null ?
					r.alsoAcceptable.aspects.includes('none')
				:	r.alsoAcceptable.aspects.includes(g.aspect))
			);
		return {
			sentiment:
				g.sentiment === null ?
					null
				:	g.sentiment === r.sentiment || r.alsoAcceptable.sentiments.includes(g.sentiment),
			aspect,
			aspectRoot:
				aspect === null ? null : (
					aspect ||
					root(g.aspect) === root(r.aspect) ||
					r.alsoAcceptable.aspects.some(a => a !== 'none' && root(a) === root(g.aspect))
				),
			kind: g.kind === null ? null : acceptedKinds(r).includes(g.kind),
			amount: r.amount !== null || g.amount !== null ? sameAmount(r, g) : null,
		};
	};
	const rightParts = (v: ReturnType<typeof judge>) =>
		Object.values(v).filter(x => x === true).length;
	// A reference claim the agent split is scored once, on its best fragment ("they reserved" and "had
	// to eat outside anyway" for one complaint); one produced claim linked to several is scored per reference
	const scored: Pairs = [];
	for (const i of linkedRef) {
		const js = ok.filter(([ri]) => ri === i).map(([, gj]) => gj);
		scored.push([i, _.maxBy(js, j => rightParts(judge(ref[i], got[j])))!]);
	}
	for (const [i, j] of scored) {
		const r = ref[i];
		const g = got[j];
		const label = short(r.text, 60);
		const v = judge(r, g);
		const miss = (metric: string, detail: string) =>
			issues.push({ caseId, ref: i, got: j, metric, detail: `${label}: ${detail}` });
		if (v.sentiment !== null) {
			add(tally, 'parts.sentiment', v.sentiment ? 1 : 0);
			if (!v.sentiment) miss('parts.sentiment', `${r.sentiment} ≠ ${g.sentiment}`);
		}
		if (v.aspect !== null) {
			add(tally, 'parts.aspect', v.aspect ? 1 : 0);
			if (!v.aspect) miss('parts.aspect', `${r.aspect ?? 'none'} ≠ ${g.aspect ?? 'none'}`);
			add(tally, 'parts.aspect_root', v.aspectRoot ? 1 : 0);
		}
		add(tally, 'parts.kind_read', g.kind !== null ? 1 : 0);
		if (v.kind !== null) {
			add(tally, 'parts.kind', v.kind ? 1 : 0);
			if (!v.kind) miss('parts.kind', `${r.kind} ≠ ${g.kind}`);
		}
		if (v.amount !== null) {
			add(tally, 'parts.amount', v.amount ? 1 : 0);
			if (!v.amount)
				miss(
					'parts.amount',
					`${r.amount ?? '—'} ${r.unit ?? ''} ≠ ${g.amount ?? '—'} ${g.unit ?? ''}`.trim(),
				);
		}
		// A shortlist's reach: the reference's aspect (or one it also accepts) among those offered;
		// "no aspect" is always offered
		if (g.offered) {
			const offered = g.offered;
			const reached =
				r.aspect === null ||
				offered.includes(r.aspect) ||
				r.alsoAcceptable.aspects.some(a => a === 'none' || offered.includes(a));
			add(tally, 'shortlist.recall', reached ? 1 : 0);
			if (!reached) miss('shortlist.recall', `${r.aspect} not offered`);
		}
		// A classifier's sure answers apart: how many are sure, and how right those are
		for (const label of CLAIM_LABELS) {
			const p = g.probability?.[label];
			const right = v[label];
			if (p === undefined || right === null) continue;
			const sure = p >= SURE_PROBABILITY;
			add(tally, `sure.${label}`, sure ? 1 : 0);
			if (sure) add(tally, `parts.${label}@sure`, right ? 1 : 0);
		}
	}

	// Foods over a split or merge as a whole: a reference claim's foods against everything its
	// linked produced claims name, a produced claim's against everything its linked references name;
	// produced claims whose foods were never read (null) are left out on both sides
	const foodsOf = (claims: { foods: string[] | null }[], idx: number[]) =>
		new Set(idx.flatMap(k => [...foodKeys(claims[k].foods)]));
	for (const i of linkedRef) {
		const js = ok.filter(([ri, gj]) => ri === i && got[gj].foods !== null).map(([, gj]) => gj);
		if (!js.length) continue;
		const rf = foodKeys(ref[i].foods);
		const gf = foodsOf(got, js);
		const found = [...rf].filter(k => sameFood(k, gf)).length;
		add(tally, 'parts.foods_recall', found, rf.size);
		if (found < rf.size)
			issues.push({
				caseId,
				ref: i,
				got: js[0],
				metric: 'parts.foods',
				detail: `${short(ref[i].text, 60)}: [${ref[i].foods.join(', ')}] ≠ [${js.flatMap(j => got[j].foods ?? []).join(', ')}]`,
			});
	}
	for (const j of linkedGot) {
		const gotFoods = got[j].foods;
		if (gotFoods === null) continue;
		const is = ok.filter(([, gj]) => gj === j).map(([ri]) => ri);
		const gf = foodKeys(gotFoods);
		const rf = foodsOf(ref, is);
		const right = [...gf].filter(k => sameFood(k, rf)).length;
		add(tally, 'parts.foods_precision', right, gf.size);
		if (right < gf.size)
			issues.push({
				caseId,
				ref: is[0],
				got: j,
				metric: 'parts.foods',
				detail: `${short(ref[is[0]].text, 60)}: [${is.flatMap(i => ref[i].foods).join(', ')}] ≠ [${gotFoods.join(', ')}]`,
			});
	}

	// Change, over every claim
	const isChange = (c: { kind: string | null }) => c.kind === 'change';
	const acceptsChange = (r: ReferenceClaim) =>
		isChange(r) || r.alsoAcceptable.kinds.includes('change');
	for (const [j, g] of got.entries()) {
		if (!isChange(g)) continue;
		const linked = ok.filter(([, gj]) => gj === j).map(([i]) => i);
		const i = linked[0];
		const right = linked.some(li => acceptsChange(ref[li]));
		add(tally, 'change.precision', right ? 1 : 0);
		if (!right)
			issues.push({ caseId, metric: 'change.false', ref: i, got: j, detail: short(g.text) });
	}
	for (const [i, r] of ref.entries()) {
		if (!isChange(r) || r.optional) continue;
		const right = ok.some(([ri, gj]) => ri === i && isChange(got[gj]));
		add(tally, 'change.recall', right ? 1 : 0);
		if (!right) issues.push({ caseId, metric: 'change.missed', ref: i, detail: short(r.text) });
	}
	return { tally, issues };
};

/**
 * A run that labelled the reference's own claims (`claimsFrom: 'reference'`): paired one to one and
 * scored on the parts alone. The claims are the reference's, so finding and keeping them (recall,
 * precision, a post's subjects, places and matches) is not this run's and not scored.
 */
export const scoreLabels = (
	caseId: string,
	ref: ReferenceClaim[],
	got: EvalClaim[],
	rootOf: (aspect: string) => string | undefined,
): CaseScore => {
	const { tally, issues } = scoreClaims(
		caseId,
		ref,
		got,
		identityPairs(Math.min(ref.length, got.length)),
		rootOf,
	);
	delete tally['claims.recall'];
	delete tally['claims.precision'];
	return {
		tally,
		issues: issues.filter(i => i.metric !== 'claims.missed' && i.metric !== 'claims.extra'),
	};
};

/**
 * A post's places paired with its reference's by name (`similarity` over normalized names, at
 * `threshold`), or as one when both were matched to the same brand, best pairs first, one to one:
 * [reference index, produced index].
 */
export const pairPlaces = (
	ref: (Pick<EvalPlace, 'venueName'> & { match?: EvalMatch | null })[],
	got: (Pick<EvalPlace, 'venueName'> & { match?: EvalMatch | null })[],
	similarity: (a: string, b: string) => number,
	threshold: number,
): Pairs => {
	// Two places matched to the same brand are the same place, however each spells it ("Magma Berlin", "Magma")
	const sameBrand = (a: { match?: EvalMatch | null }, b: { match?: EvalMatch | null }) =>
		!!a.match?.brandId && a.match.brandId === b.match?.brandId;
	const candidates = ref.flatMap((r, i) =>
		got.map((g, j) => ({
			i,
			j,
			s: sameBrand(r, g) ? 1 : similarity(r.venueName, g.venueName),
		})),
	);
	const pairs: Pairs = [];
	const usedRef = new Set<number>();
	const usedGot = new Set<number>();
	for (const { i, j, s } of _.orderBy(candidates, c => c.s, 'desc')) {
		if (s < threshold || usedRef.has(i) || usedGot.has(j)) continue;
		pairs.push([i, j]);
		usedRef.add(i);
		usedGot.add(j);
	}
	return pairs;
};

/** One place's match against the reference's: the brand (none against none counts right), then the branch */
const scoreMatch = (
	caseId: string,
	prefix: string,
	ref: EvalMatch,
	got: EvalMatch | null,
	tally: Tally,
	issues: Issue[],
	name: string,
) => {
	const brandOk = (got?.brandId ?? null) === ref.brandId;
	add(tally, `${prefix}.brand`, brandOk ? 1 : 0);
	if (!brandOk)
		issues.push({
			caseId,
			metric: `${prefix}.brand`,
			detail: `${short(name, 40)}: ${ref.brandName ?? 'none'} ≠ ${got?.brandName ?? 'none'}${got?.method ? ` (${got.method})` : ''}`,
		});
	if (brandOk && ref.brandId) {
		const branchOk = (got?.venueId ?? null) === ref.venueId;
		add(tally, `${prefix}.branch`, branchOk ? 1 : 0);
		if (!branchOk)
			issues.push({
				caseId,
				metric: `${prefix}.branch`,
				detail: `${short(name, 40)}: ${ref.venueName ?? 'brand only'} ≠ ${got?.venueName ?? 'brand only'}`,
			});
	}
};

/**
 * A post against its reference: its places (recall, precision, each paired place's match), the
 * claims as `scoreClaims` scores them, and per paired claim its subject and the place it is about
 * (the produced place must be the one paired with the reference's). Matching on the reference's own
 * places, when the run did it, is scored apart (`match_isolated`).
 */
export const scorePost = (
	caseId: string,
	ref: {
		isPromotional: boolean;
		places: (Omit<EvalPlace, 'match'> & { match: EvalMatch })[];
		claims: ReferencePostClaim[];
	},
	got:
		| PostOutput
		| {
				isPromotional: boolean | null;
				places: EvalPlace[];
				claims: EvalPostClaim[];
				referencePlaceMatches?: EvalMatch[];
		  },
	claimPairs: Pairs,
	placeSimilarity: (a: string, b: string) => number,
	placeThreshold: number,
	rootOf: (aspect: string) => string | undefined,
): CaseScore => {
	const { tally, issues } = scoreClaims(caseId, ref.claims, got.claims, claimPairs, rootOf);
	if (got.isPromotional !== null)
		add(tally, 'post.promotional', got.isPromotional === ref.isPromotional ? 1 : 0);

	const placePairs = pairPlaces(ref.places, got.places, placeSimilarity, placeThreshold);
	const refOfGot = new Map(placePairs.map(([i, j]) => [j, i]));
	const gotOfRef = new Map(placePairs);
	for (const [i, r] of ref.places.entries()) {
		const j = gotOfRef.get(i);
		add(tally, 'places.recall', j !== undefined ? 1 : 0);
		if (j === undefined)
			issues.push({ caseId, metric: 'places.missed', ref: i, detail: r.venueName });
		else scoreMatch(caseId, 'match', r.match, got.places[j].match, tally, issues, r.venueName);
	}
	for (const [j, g] of got.places.entries()) {
		add(tally, 'places.precision', refOfGot.has(j) ? 1 : 0);
		if (!refOfGot.has(j))
			issues.push({ caseId, metric: 'places.extra', got: j, detail: g.venueName });
	}
	if (got.referencePlaceMatches)
		for (const [i, r] of ref.places.entries())
			scoreMatch(
				caseId,
				'match_isolated',
				r.match,
				got.referencePlaceMatches[i] ?? null,
				tally,
				issues,
				r.venueName,
			);

	for (const [i, j] of validLinks(claimPairs, ref.claims.length, got.claims.length)) {
		const r = ref.claims[i];
		const g = got.claims[j];
		const subjectOk = r.subject === g.subject;
		add(tally, 'claims.subject', subjectOk ? 1 : 0);
		if (!subjectOk)
			issues.push({
				caseId,
				ref: i,
				got: j,
				metric: 'claims.subject',
				detail: `${short(r.text, 60)}: ${r.subject} ≠ ${g.subject}`,
			});
		if (subjectOk && r.subject === 'place' && r.place !== null) {
			const placeOk = g.place !== null && refOfGot.get(g.place) === r.place;
			add(tally, 'claims.place', placeOk ? 1 : 0);
			if (!placeOk)
				issues.push({
					caseId,
					ref: i,
					got: j,
					metric: 'claims.place',
					detail: `${short(r.text, 60)}: ${ref.places[r.place]?.venueName} ≠ ${g.place !== null ? got.places[g.place]?.venueName : 'none'}`,
				});
		}
	}
	return { tally, issues };
};

/**
 * A wording's topics against its reference's: precision (each produced key is the reference's or
 * one it also accepts), recall over the reference's keys, the whole set, the first topic, the
 * relation on shared keys, and "no topic" both ways.
 */
export const scoreTerm = (
	caseId: string,
	name: string,
	ref: { topics: EvalTermTopic[]; alsoAcceptable: string[] },
	got: { topics: EvalTermTopic[] },
): CaseScore => {
	const tally: Tally = {};
	const issues: Issue[] = [];
	const refKeys = ref.topics.map(t => t.key);
	const allowed = new Set([...refKeys, ...ref.alsoAcceptable]);
	const gotKeys = got.topics.map(t => t.key);
	if (!refKeys.length) {
		const right = !gotKeys.length;
		add(tally, 'terms.none', right ? 1 : 0);
		if (!right)
			issues.push({
				caseId,
				metric: 'terms.none',
				detail: `${name}: none ≠ ${gotKeys.join(', ')}`,
			});
		return { tally, issues };
	}
	const precise = gotKeys.filter(k => allowed.has(k)).length;
	add(tally, 'terms.precision', precise, gotKeys.length);
	add(tally, 'terms.recall', refKeys.filter(k => gotKeys.includes(k)).length, refKeys.length);
	const exact = refKeys.every(k => gotKeys.includes(k)) && gotKeys.every(k => allowed.has(k));
	add(tally, 'terms.exact', exact ? 1 : 0);
	add(
		tally,
		'terms.first',
		gotKeys.length && (gotKeys[0] === refKeys[0] || ref.alsoAcceptable.includes(gotKeys[0])) ?
			1
		:	0,
	);
	add(tally, 'terms.linked', gotKeys.length ? 1 : 0);
	for (const t of ref.topics) {
		const g = got.topics.find(x => x.key === t.key);
		if (g) add(tally, 'terms.relation', g.relation === t.relation ? 1 : 0);
	}
	if (!exact)
		issues.push({
			caseId,
			metric: 'terms.topics',
			detail: `${name}: [${ref.topics.map(t => `${t.key}:${t.relation}`).join(', ')}] ≠ [${got.topics.map(t => `${t.key}:${t.relation}`).join(', ') || 'none'}]`,
		});
	return { tally, issues };
};

/** A tally's share, or null when nothing was counted */
export const rate = ([right, outOf]: [number, number]): number | null =>
	outOf ? right / outOf : null;
