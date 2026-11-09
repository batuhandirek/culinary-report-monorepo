/**
 * The ingestion eval's command line (`npm run eval -- <command>`, from the repo root, on the built
 * backend in `dist`). Commands:
 *
 *   collect   [--reviews 150] [--posts 150] [--terms 500] [--seed eval-1]   cases from the dev DB (tops up)
 *   reference [--kind review,post,term] [--ids a,b] [--limit n] [--force] [--max-usd 5]   Opus references (paid)
 *             [--model openai/gpt-5.4 --as-run <label>]   a second reader: the same task on another model (free only),
 *                                      written as a run and scored against the references (where they disagree)
 *   run       --label <name> [--kind …] [--ids …] [--split test|train] [--limit n] [--force] [--paid]   the pipeline's
 *                                      reading as production runs it: agent A (its claims, foods and numbers) on its own
 *                                      model, the claim-labels classifier (Jev) for the labels; `--paid` lets an LLM
 *                                      call move to Claude once the allowance is out
 *             [--model <id>]       agent A on another model (`openai/gpt-5.4`, Claude with `--paid`)
 *             [--classifier-model typesafe-ai/jev-latest] [--aspect-shortlist 12]  the classifier's model; offer it only
 *                                      the 12 aspects closest to the claim (embedded) and their roots
 *                                      (production offers `ASPECT_SHORTLIST_SIZE`, 12)
 *             [--claims agent|reference]   label agent A's claims (default) or the reference's own (no agent A, no
 *                                      matching, no pairing: the labeller scored alone)
 *   score     --label <name>           (the label `stored` scores what the DB holds)
 *   adjudicate --label <name> [--ids …] [--limit n] [--apply]   Opus rules on the run's misses (paid), then
 *                                      `--apply` folds the rulings into the references; scores again
 *   compare   --label <candidate> --base <run> [--noise <run>,<run>] [--goal post:claims.recall] [--split test|train|all] [--tag size:large]
 *                                      the candidate against the base on the held-back cases, per metric:
 *                                      better, worse or within the threshold (bootstrap, and the noise run)
 *   relabel-aspects [--ids …] [--max-usd 6]   the references' aspects answered again by Opus after the
 *                                      aspect table changed (paid), nothing else of them touched
 *   relabel-promotional [--ids …] [--max-usd 5]   the post references' promotional flag answered again by
 *                                      Opus by step A's rules now (paid), nothing else touched
 *   restamp   --note "<why>" [--ids …]   references marked as written under the rules now (no model call),
 *                                      for a rules change that moved no right answer
 *   status                             cases, references and runs on disk
 */
import 'reflect-metadata';

import { initDotEnv } from 'src/shared/util/env.js';

initDotEnv();

type Args = { _: string[]; [flag: string]: string | boolean | string[] };

const parse = (argv: string[]): Args => {
	const args: Args = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith('--')) {
			args._.push(a);
			continue;
		}
		const key = a.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) args[key] = true;
		else {
			args[key] = next;
			i++;
		}
	}
	return args;
};

const list = (v: unknown): string[] | undefined =>
	typeof v === 'string' ?
		v
			.split(',')
			.map(s => s.trim())
			.filter(Boolean)
	:	undefined;
const num = (v: unknown): number | undefined => (typeof v === 'string' ? Number(v) : undefined);

async function main() {
	const args = parse(process.argv.slice(2));
	const [command] = args._;
	const { NestFactory } = await import('@nestjs/core');
	const { EvalModule } = await import('./eval.module.js');
	const { readCases, readRunJson, runLabels } = await import('./util/eval-files.js');
	const kinds = (list(args.kind) ?? ['review', 'post', 'term']) as ('review' | 'post' | 'term')[];

	if (command === 'compare') {
		const { compareRuns, renderCompare } = await import('./util/eval-compare.js');
		const { writeRunFile } = await import('./util/eval-files.js');
		type T = import('./util/eval-compare.js').CaseTallies;
		const label = args.label;
		const baseLabel = args.base;
		if (typeof label !== 'string' || typeof baseLabel !== 'string')
			throw new Error('compare needs --label <candidate> --base <run>');
		const load = (l: string) => {
			const t = readRunJson<T>(l, 'cases.json');
			if (!t) throw new Error(`run ${l} has no cases.json: score it first`);
			return t;
		};
		const noiseLabels = list(args.noise);
		if (noiseLabels && noiseLabels.length !== 2)
			throw new Error('--noise takes two runs of the same prompts: --noise a,b');
		const noiseLabel = noiseLabels?.join(' / ');
		const split = (typeof args.split === 'string' ? args.split : 'test') as
			'test' | 'train' | 'all';
		const [goalKind, goalMetric] = typeof args.goal === 'string' ? args.goal.split(':') : [];
		const goal =
			goalKind && goalMetric ?
				{ kind: goalKind as 'review' | 'post' | 'term', metric: goalMetric }
			:	undefined;
		const rows = compareRuns(load(baseLabel), load(label), {
			noise: noiseLabels ? [load(noiseLabels[0]), load(noiseLabels[1])] : undefined,
			split,
			goal,
			tag: typeof args.tag === 'string' ? args.tag : undefined,
		});
		const md = renderCompare(
			rows,
			{
				base: baseLabel,
				candidate: label,
				noise: noiseLabel,
				split,
				tag: typeof args.tag === 'string' ? args.tag : undefined,
			},
			goal,
		);
		writeRunFile(label, `compare-${baseLabel}.md`, md);
		console.log(md);
		return;
	}

	if (command === 'status') {
		const cases = readCases();
		for (const kind of ['review', 'post', 'term'] as const) {
			const of = cases.filter(c => c.kind === kind);
			console.log(
				`${kind}: ${of.length} cases, ${of.filter(c => c.reference).length} with a reference`,
			);
		}
		for (const label of runLabels()) {
			const s = readRunJson<{ at: string }>(label, 'scores.json');
			console.log(`run ${label}${s ? `: scored ${s.at}` : ': not scored'}`);
		}
		return;
	}

	const app = await NestFactory.createApplicationContext(EvalModule, {
		logger: ['log', 'warn', 'error'],
	});
	const { MikroORM, RequestContext } = await import('@mikro-orm/core');
	try {
		// The Opus commands, and a run told `--paid`, may use Claude; the rest stay on the free models
		// and fail once the allowance is out, as production does
		const { llmPaid } = await import('src/modules/llm/util/llm-scope.js');
		const paid =
			(command === 'reference' && typeof args['as-run'] !== 'string') ||
			['relabel-aspects', 'relabel-promotional', 'adjudicate'].includes(String(command)) ||
			(command === 'run' && !!args.paid);
		// One context for the command: services reading through the global entity manager (`TopicService`) need one
		const go = () =>
			RequestContext.create(app.get(MikroORM).em, () => command_(app, args, kinds));
		await (paid ? llmPaid(go) : go());
	} finally {
		await app.close();
	}
}

async function command_(
	app: import('@nestjs/common').INestApplicationContext,
	args: Args,
	kinds: ('review' | 'post' | 'term')[],
) {
	const [command] = args._;
	{
		if (command === 'collect') {
			const { EvalCollectService } = await import('./services/eval-collect.service.js');
			const res = await app.get(EvalCollectService).collect({
				reviews: num(args.reviews),
				posts: num(args.posts),
				terms: num(args.terms),
				seed: typeof args.seed === 'string' ? args.seed : undefined,
			});
			console.log(
				`Collected: ${res.reviews} reviews, ${res.posts} posts, ${res.terms} wordings`,
			);
		} else if (command === 'reference') {
			const { EvalReferenceService } = await import('./services/eval-reference.service.js');
			const res = await app.get(EvalReferenceService).run({
				kinds,
				ids: list(args.ids),
				limit: num(args.limit),
				force: !!args.force,
				maxUsd: num(args['max-usd']),
				...(typeof args.model === 'string' && {
					model: args.model as import('src/modules/llm/constants/llm-models.constant.js').LlmModelId,
				}),
				...(typeof args['as-run'] === 'string' && { asRun: args['as-run'] }),
			});
			if (typeof args['as-run'] === 'string') {
				const { EvalScoreService } = await import('./services/eval-score.service.js');
				await app.get(EvalScoreService).score(args['as-run']);
				console.log(`Report: apps/backend/eval/runs/${args['as-run']}/report.md`);
			}
			const per = res.perCase.map(p => p.usd).sort((a, b) => a - b);
			const median = per.length ? per[Math.floor(per.length / 2)] : 0;
			console.log(
				`References: ${res.written} written, ${res.failed} failed, ${res.rejected} discarded (another model answered)\n` +
					`Tokens: ${res.usage.inputTokens} in (${res.usage.cachedInputTokens} cached, ${res.usage.cacheWriteTokens} written), ${res.usage.outputTokens} out\n` +
					`Spend: $${res.usd.toFixed(3)} (per call median $${median.toFixed(3)}, min $${(per[0] ?? 0).toFixed(3)}, max $${(per.at(-1) ?? 0).toFixed(3)})`,
			);
			for (const p of res.perCase)
				console.log(
					`  ${p.id}: $${p.usd.toFixed(3)} (${p.inputTokens} in, ${p.outputTokens} out)`,
				);
		} else if (command === 'run') {
			if (typeof args.label !== 'string') throw new Error('run needs --label <name>');
			const { EvalRunService } = await import('./services/eval-run.service.js');
			const { EvalScoreService } = await import('./services/eval-score.service.js');
			const { EVAL_CLAIMS_FROM } = await import('./services/eval-run.service.js');
			const { isLlmModelChoice } =
				await import('src/modules/llm/constants/llm-models.constant.js');
			const { isDecisionModelId } =
				await import('src/modules/llm/constants/decision-models.constant.js');
			type Reading = import('./services/eval-run.service.js').EvalReading;
			const oneOf = <T extends string>(flag: string, allowed: T[], fallback: T): T => {
				const v = typeof args[flag] === 'string' ? (args[flag] as string) : fallback;
				if (!allowed.includes(v as T))
					throw new Error(`--${flag} is one of ${allowed.join(', ')}`);
				return v as T;
			};
			const modelFlag = (flag: string) => {
				const v = typeof args[flag] === 'string' ? (args[flag] as string) : undefined;
				if (v !== undefined && !isLlmModelChoice(v))
					throw new Error(`--${flag} ${v} is no tier or model id`);
				return v;
			};
			const claims = oneOf('claims', EVAL_CLAIMS_FROM, 'agent');
			const classifierModel =
				typeof args['classifier-model'] === 'string' ? args['classifier-model'] : undefined;
			if (classifierModel !== undefined && !isDecisionModelId(classifierModel))
				throw new Error(`--classifier-model ${classifierModel} is no decision model id`);
			const reading = {
				...(modelFlag('model') && { model: modelFlag('model') }),
				...(classifierModel && { classifierModel }),
				...(num(args['aspect-shortlist']) && {
					aspectShortlist: num(args['aspect-shortlist']),
				}),
				...(claims !== 'agent' && { claims }),
			} as Reading;
			const res = await app.get(EvalRunService).run(args.label, {
				kinds,
				ids: list(args.ids),
				limit: num(args.limit),
				force: !!args.force,
				reading,
				...(typeof args.split === 'string' && {
					split: oneOf<'train' | 'test'>('split', ['train', 'test'], 'test'),
				}),
			});
			console.log(`Ran ${res.ran} cases, ${res.failed} failed, ${res.tokens} tokens`);
			await app.get(EvalScoreService).score(args.label);
			console.log(`Report: apps/backend/eval/runs/${args.label}/report.md`);
		} else if (command === 'score') {
			if (typeof args.label !== 'string') throw new Error('score needs --label <name>');
			const { EvalScoreService } = await import('./services/eval-score.service.js');
			await app.get(EvalScoreService).score(args.label);
			console.log(`Report: apps/backend/eval/runs/${args.label}/report.md`);
		} else if (command === 'relabel-aspects') {
			const { EvalReferenceService } = await import('./services/eval-reference.service.js');
			const res = await app.get(EvalReferenceService).relabelAspects({
				ids: list(args.ids),
				maxUsd: num(args['max-usd']),
			});
			console.log(
				`Aspects answered again on ${res.cases} cases (${res.failed} failed): ${res.changed} claims changed, $${res.usd.toFixed(3)}`,
			);
		} else if (command === 'relabel-promotional') {
			const { EvalReferenceService } = await import('./services/eval-reference.service.js');
			const res = await app.get(EvalReferenceService).relabelPromotional({
				ids: list(args.ids),
				maxUsd: num(args['max-usd']),
			});
			console.log(
				`Promotional answered again on ${res.cases} posts (${res.failed} failed): ${res.changed} changed, $${res.usd.toFixed(3)}`,
			);
		} else if (command === 'restamp') {
			if (typeof args.note !== 'string')
				throw new Error('restamp needs --note "<why no right answer moved>"');
			const { EvalScoreService } = await import('./services/eval-score.service.js');
			const n = await app.get(EvalScoreService).restamp(list(args.ids), args.note);
			console.log(`Restamped ${n} references`);
		} else if (command === 'adjudicate') {
			if (typeof args.label !== 'string') throw new Error('adjudicate needs --label <name>');
			const { EvalAdjudicationService } =
				await import('./services/eval-adjudication.service.js');
			const { EvalScoreService } = await import('./services/eval-score.service.js');
			const res = await app.get(EvalAdjudicationService).adjudicate(args.label, {
				ids: list(args.ids),
				limit: num(args.limit),
				apply: !!args.apply,
			});
			console.log(
				`Ruled ${res.ruled} of ${res.cases} cases, $${res.usd.toFixed(3)}; verdicts ${JSON.stringify(res.verdicts)}` +
					(args.apply ? `; ${res.applied} reference changes applied` : ''),
			);
			// Scored again: the report's "after rulings" column (and, applied, the references' new answers)
			await app.get(EvalScoreService).score(args.label);
			console.log(`Report: apps/backend/eval/runs/${args.label}/report.md`);
		} else {
			console.log(
				'Commands: collect, reference, run, score, adjudicate, compare, status (see the head of eval.cli.ts)',
			);
		}
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
