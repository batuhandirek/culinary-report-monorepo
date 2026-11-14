/**
 * The venue-topics converter's command line (`npm run venue-topics -- <command>`, from the repo
 * root, on the built backend in `dist`). One-off, paid, started by hand on a copy of production:
 *
 *   status  the food categories, how many are decided here, in the file, a topic's name, left to ask
 *   decide [--limit n] [--max-usd 1] [--model anthropic/claude-haiku-5-5] [--concurrency 12] [--again none,aspect]
 *           asks agent C about every food category no decision covers (`VenueTopicsConvertService`)
 *           and appends the answers to `tmp/venue-topics/results.jsonl`; a second run continues it.
 *           `--again` asks the file's "none" or aspect answers once more (a later line wins), e.g. on a
 *           stronger model; only before a database applied the file.
 *
 * Every database applies the file at boot (`VenueTopicsImportService`).
 */
import 'reflect-metadata';

import { initDotEnv } from 'src/shared/util/env.js';

initDotEnv();

const flag = (name: string): string | undefined => {
	const i = process.argv.indexOf(`--${name}`);
	const next = i < 0 ? undefined : process.argv[i + 1];
	return next && !next.startsWith('--') ? next : undefined;
};
const num = (v: string | undefined) => (v === undefined ? undefined : Number(v));

async function main() {
	const command = process.argv[2];
	if (command !== 'status' && command !== 'decide') throw new Error('Commands: status, decide');
	const { NestFactory } = await import('@nestjs/core');
	const { VenueTopicsModule } = await import('./venue-topics.module.js');
	const app = await NestFactory.createApplicationContext(VenueTopicsModule, {
		logger: ['log', 'warn', 'error'],
	});
	const { MikroORM, RequestContext } = await import('@mikro-orm/core');
	try {
		const { VenueTopicsConvertService } = await import('./services/venue-topics-convert.service.js');
		const service = app.get(VenueTopicsConvertService);
		const inContext = <T>(fn: () => Promise<T>) => RequestContext.create(app.get(MikroORM).em, fn);
		if (command === 'status') {
			const plan = await inContext(() => service.plan());
			console.log(
				`${plan.categories} food categories: ${plan.decided} decided here, ${plan.inFile} in the file, ` +
					`${plan.matched.length} a topic's name, ${plan.toAsk.length} to ask ` +
					`(${plan.toAsk.reduce((n, w) => n + w.venues, 0)} venue categories)`,
			);
			for (const w of plan.toAsk.slice(0, 30)) console.log(`  ${w.venues}\t${w.name}`);
			return;
		}
		const { llmPaid } = await import('src/modules/llm/util/llm-scope.js');
		const model = flag('model') as import('src/modules/llm/constants/llm-models.constant.js').LlmModelId | undefined;
		const res = await llmPaid(() =>
			inContext(() =>
				service.decide({
					limit: num(flag('limit')),
					maxUsd: num(flag('max-usd')),
					concurrency: num(flag('concurrency')),
					...(model && { model }),
					...(flag('again') && {
						again: flag('again')!.split(',').filter((x): x is 'none' | 'aspect' => x === 'none' || x === 'aspect'),
					}),
				}),
			),
		);
		console.log(
			`Categories: ${res.categories} (${res.decided} decided here, ${res.inFile} in the file before, ${res.matched} a topic's name, ` +
				`${res.asked} asked, ${res.none} of them none, ${res.unanswered} unanswered)\n` +
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
