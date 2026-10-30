// The model's investigations, checked line by line before an owner reads them. Pure.
//
// A line goes out only when every number in it is one the model was given (the observation,
// its checks, the prompt, every tool answer), it stays inside its length, and it states a
// possibility, never a cause. A failing `whatHappened` falls back to the observation's own
// sentence; a failing hypothesis is dropped; a failing evidence line is dropped alone.

import { numbersOf, strayNumber, wordCount } from 'src/shared/util/stated-numbers.js';

import type {
	ReportAnalysisAnswer,
	ReportHypothesis,
	ReportInvestigation,
	ReportObservation,
} from '../interfaces/report-analysis.interface.js';

/** Words per kind of line, at most. */
export const ANALYSIS_WORDS = {
	whatHappened: 40,
	reason: 30,
	evidence: 35,
	cannotTell: 35,
	worthChecking: 25,
} as const;

/** A reason is a possibility: these words state a cause. */
export const CAUSAL = /\b(because|caused?|causing|due to|led to|leads? to|resulted in|results? in|thanks to|drove|driven by|owing to)\b/i;

// The brand's voice (`brand` skill)
export const ANALYSIS_BANNED = [
	/\binsights?\b/i,
	/\banalytics\b/i,
	/\bdata-driven\b/i,
	/\bleverag\w*/i,
	/\binfluencers?\b/i,
	/\bviral\b/i,
	/\bmust-try\b/i,
	/\bfoodies?\b/i,
	/\bhidden gems?\b/i,
	/\bgame-?changer\b/i,
	/!!/,
];

/** Why a line can't go out, or null when it can. */
export const analysisLineProblem = (text: string | undefined | null, given: number[], maxWords: number): string | null => {
	const line = text?.trim();
	if (!line) return 'empty';
	if (wordCount(line) > maxWords) return `over ${maxWords} words`;
	const banned = ANALYSIS_BANNED.find(re => re.test(line));
	if (banned) return `says ${line.match(banned)![0]}`;
	const causal = line.match(CAUSAL);
	if (causal) return `states a cause: "${causal[0]}"`;
	const stray = strayNumber(line, given);
	if (stray !== null) return `states ${stray}, which it was not given`;
	return null;
};

const fallbackOf = (o: Pick<ReportObservation, 'key' | 'sentence'>): ReportInvestigation => ({
	key: o.key,
	whatHappened: o.sentence,
	hypotheses: [],
	worthChecking: [],
	fallback: true,
});

/**
 * The investigations an owner may read: one per observation sent, in the observations' order.
 * `given` is everything the model saw (the prompt input and every tool result); each
 * observation's own numbers count for its lines too. `answer` null (the agent failed) gives
 * every observation its fallback.
 */
export const checkAnalysis = (
	answer: ReportAnalysisAnswer | null,
	observations: Pick<ReportObservation, 'key' | 'sentence' | 'from' | 'to' | 'change' | 'changePercent' | 'series' | 'checks'>[],
	given: unknown[],
	onProblem: (where: string, problem: string) => void = () => {},
): ReportInvestigation[] => {
	const shared = numbersOf(given);
	const byKey = new Map((answer?.investigations ?? []).map(i => [i.key, i]));
	for (const key of byKey.keys()) if (!observations.some(o => o.key === key)) onProblem(key, 'an observation that was not asked about');

	return observations.map(o => {
		const a = byKey.get(o.key);
		if (!a) {
			if (answer) onProblem(o.key, 'no investigation returned');
			return fallbackOf(o);
		}
		const numbers = [...shared, ...numbersOf(o)];
		const take = (where: string, text: string | undefined | null, maxWords: number): string | undefined => {
			const problem = analysisLineProblem(text, numbers, maxWords);
			if (problem) {
				onProblem(`${o.key} · ${where}`, problem);
				return undefined;
			}
			return text!.trim();
		};
		const lines = (where: string, texts: string[] | undefined, maxWords: number) =>
			(texts ?? []).map((t, i) => take(`${where} ${i + 1}`, t, maxWords)).filter((t): t is string => !!t);

		const whatHappened = take('whatHappened', a.whatHappened, ANALYSIS_WORDS.whatHappened);
		const hypotheses = (a.hypotheses ?? []).flatMap((h, i): ReportHypothesis[] => {
			const reason = take(`hypothesis ${i + 1}`, h.reason, ANALYSIS_WORDS.reason);
			if (!reason) return [];
			const evidenceFor = lines(`hypothesis ${i + 1} evidence for`, h.evidenceFor, ANALYSIS_WORDS.evidence);
			const evidenceAgainst = lines(`hypothesis ${i + 1} evidence against`, h.evidenceAgainst, ANALYSIS_WORDS.evidence);
			let confidence = h.confidence;
			if (confidence === 'likely' && !evidenceFor.length) {
				onProblem(`${o.key} · hypothesis ${i + 1}`, 'likely without evidence for it: downgraded to possible');
				confidence = 'possible';
			}
			if (!['likely', 'possible', 'unclear'].includes(confidence)) {
				onProblem(`${o.key} · hypothesis ${i + 1}`, `unknown confidence "${confidence}": set to unclear`);
				confidence = 'unclear';
			}
			return [{ reason, confidence, evidenceFor, evidenceAgainst }];
		});
		const cannotTell = a.cannotTell ? take('cannotTell', a.cannotTell, ANALYSIS_WORDS.cannotTell) : undefined;
		const worthChecking = lines('worthChecking', a.worthChecking, ANALYSIS_WORDS.worthChecking);

		return {
			key: o.key,
			whatHappened: whatHappened ?? o.sentence,
			hypotheses,
			...(cannotTell && { cannotTell }),
			worthChecking,
			...(!whatHappened && { fallback: true }),
		};
	});
};
