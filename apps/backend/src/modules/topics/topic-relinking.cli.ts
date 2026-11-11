/**
 * The topic-relinking converter's command line (`npm run topic-relinking -- <command>`, from the
 * repo root, on the built backend in `dist`). One-off, paid, started by hand on a fresh clone of
 * production **before** the topic-graph migration is applied to it (`SKIP_MIGRATIONS=true`, which
 * the root script sets):
 *
 *   convert [--limit n] [--max-usd 5] [--model anthropic/claude-haiku-5-5] [--fresh] [--decided-only]
 *           [--recheck-none anthropic/claude-sonnet-5-5] [--concurrency 12]
 *           asks agent C, under the graph's contract, about every decided wording one `same` link
 *           doesn't settle, then every wording never decided (production's `terms` backlog's work;
 *           `--decided-only` leaves those to it), and writes `tmp/topic-relinking/terms.json`. A
 *           second run continues the file (`--fresh` starts over). `--recheck-none` asks every
 *           "none" the agent gave a never-decided wording again on a stronger model.
 *   sample [--size 150] [--models a,b,…] [--reference <model>] [--out file.json]
 *           asks each model about the same undecided wordings, writes their answers side by side
 *           and prints how each agrees with the reference (the last model by default). Nothing
 *           stored. Paid.
 *   status  what the file holds
 */
import 'reflect-metadata';

import { initDotEnv } from 'src/shared/util/env.js';

initDotEnv();

const flag = (name: string): string | boolean | undefined => {
	const i = process.argv.indexOf(`--${name}`);
	if (i < 0) return undefined;
	const next = process.argv[i + 1];
	return next === undefined || next.startsWith('--') ? true : next;
};
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const num = (v: unknown): number | undefined => (typeof v === 'string' ? Number(v) : undefined);

async function main() {
	const command = process.argv[2];
	const { readTopicRelinking } = await import('./util/topic-relinking-file.js');
	if (command === 'status') {
		const file = readTopicRelinking();
		if (!file) return console.log('No tmp/topic-relinking/terms.json yet');
		const entries = Object.values(file.terms);
		console.log(
			`${file.generatedAt} on ${file.model}: ${entries.length} wordings ` +
				`(${entries.filter(e => e.decidedAt === null).length} never decided before; ` +
				`${entries.filter(e => e.exact).length} exact, ${entries.filter(e => e.none).length} none, ` +
				`${entries.filter(e => !e.exact && !e.none).length} narrower), ${file.unanswered.length} unanswered, ` +
				`$${file.usd.toFixed(2)}, ${file.tokens} tokens`,
		);
		return;
	}
	if (command !== 'convert' && command !== 'sample')
		throw new Error('Commands: convert, sample, status');

	const { NestFactory } = await import('@nestjs/core');
	const { TopicRelinkingModule } = await import('./topic-relinking.module.js');
	const app = await NestFactory.createApplicationContext(TopicRelinkingModule, {
		logger: ['log', 'warn', 'error'],
	});
	const { MikroORM, RequestContext } = await import('@mikro-orm/core');
	try {
		const { llmPaid } = await import('src/modules/llm/util/llm-scope.js');
		const { TopicRelinkingConvertService } =
			await import('./services/topic-relinking-convert.service.js');
		if (command === 'sample') {
			const models = String(
				flag('models') || 'anthropic/claude-haiku-5-5,anthropic/claude-opus-5-5',
			).split(',') as import('src/modules/llm/constants/llm-models.constant.js').LlmModelId[];
			const reference = String(flag('reference') || models[models.length - 1]);
			const rows = await llmPaid(() =>
				RequestContext.create(app.get(MikroORM).em, () =>
					app
						.get(TopicRelinkingConvertService)
						.sample({ size: num(flag('size')) ?? 150, models }),
				),
			);
			const out =
				typeof flag('out') === 'string' ?
					String(flag('out'))
				:	'topic-relinking-sample.json';
			const { writeFileSync } = await import('node:fs');
			writeFileSync(out, `${JSON.stringify(rows, null, 2)}\n`);
			console.log(`${rows.length} wordings, answers in ${out}`);
			for (const model of models) {
				const answered = rows.flatMap(r => {
					const mine = r.answers.find(a => a.model === model || a.model.endsWith(model));
					return mine ? [{ r, mine }] : [];
				});
				const usd = sumOf(answered.map(x => x.mine.usd));
				const failed = answered.filter(x => !x.mine.entry).length;
				console.log(
					`\n${model}: ${answered.length - failed} answered, ${failed} failed, $${usd.toFixed(3)}`,
				);
				if (model === reference) continue;
				const pairs = rows.flatMap(r => {
					const a = r.answers.find(
						x => x.model === model || x.model.endsWith(model),
					)?.entry;
					const b = r.answers.find(
						x => x.model === reference || x.model.endsWith(reference),
					)?.entry;
					return a && b ? [{ a, b }] : [];
				});
				const shape = (e: (typeof pairs)[number]['a']) =>
					e.none ? 'none'
					: e.exact ? 'exact'
					: 'narrower';
				const label = (e: (typeof pairs)[number]['a']) =>
					(e.proposedLabel ?? '').trim().toLowerCase();
				const mods = (e: (typeof pairs)[number]['a']) =>
					(e.modifiers ?? [])
						.map(m => `${m.type}:${m.topic}`)
						.sort()
						.join(',');
				const count = (f: (p: (typeof pairs)[number]) => boolean) =>
					`${pairs.filter(f).length} of ${pairs.length}`;
				console.log(`  against ${reference}:`);
				console.log(
					`  same shape (none / exact / narrower): ${count(p => shape(p.a) === shape(p.b))}`,
				);
				console.log(
					`  same main topic:                      ${count(p => (p.a.topic ?? null) === (p.b.topic ?? null))}`,
				);
				console.log(
					`  same shape and main topic:            ${count(p => shape(p.a) === shape(p.b) && (p.a.topic ?? null) === (p.b.topic ?? null))}`,
				);
				console.log(
					`  … and same label when narrower:       ${count(p => shape(p.a) === shape(p.b) && (p.a.topic ?? null) === (p.b.topic ?? null) && (shape(p.a) !== 'narrower' || label(p.a) === label(p.b)))}`,
				);
				console.log(
					`  same modifiers:                       ${count(p => mods(p.a) === mods(p.b))}`,
				);
			}
			return;
		}
		const model = flag('model');
		const recheckNone = flag('recheck-none');
		const res = await llmPaid(() =>
			RequestContext.create(app.get(MikroORM).em, () =>
				app.get(TopicRelinkingConvertService).convert({
					limit: num(flag('limit')),
					maxUsd: num(flag('max-usd')),
					fresh: !!flag('fresh'),
					decidedOnly: !!flag('decided-only'),
					concurrency: num(flag('concurrency')),
					...(typeof model === 'string' && {
						model: model as import('src/modules/llm/constants/llm-models.constant.js').LlmModelId,
					}),
					...(typeof recheckNone === 'string' && {
						recheckNone:
							recheckNone as import('src/modules/llm/constants/llm-models.constant.js').LlmModelId,
					}),
				}),
			),
		);
		console.log(
			`Wordings: ${res.wordings}, ${res.undecided} never decided (${res.kept} kept from the file, ${res.matched} a topic's name, ` +
				`${res.asked} asked, ${res.rechecked} "none" asked again (${res.recheckFound} found a topic), ${res.unanswered} unanswered)\n` +
				`Spend: $${res.usd.toFixed(3)}, ${res.tokens} tokens\nFile: ${res.file}`,
		);
	} finally {
		await app.close();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
