import { jest } from '@jest/globals';

import { IngestionService, type ReadPass } from '../../services/ingestion.service.js';

const caughtUp = (): ReadPass => ({
	extracted: 0,
	skipped: 0,
	matched: 0,
	reviews: 0,
	comments: 0,
	press: 0,
	pending: { posts: 0, mentions: 0, reviews: 0, comments: 0, press: 0 },
});

/**
 * `IngestionService` with the reading always caught up and nothing to read: for suites about
 * the steps themselves, so a gated step goes on at once. `ingestion.pglite.spec.ts` covers the
 * reading and the waiting.
 */
export const caughtUpIngestion = () => ({
	provide: IngestionService,
	useValue: {
		queue: jest.fn(async () => undefined),
		locked: jest.fn(async <T>(_cityId: string, fn: () => Promise<T>) => fn()),
		ingest: jest.fn(async () => caughtUp()),
		ingestCity: jest.fn(async () => caughtUp()),
		catchUp: jest.fn(async () => ({ ready: true, pass: caughtUp() })),
		pending: jest.fn(async () => caughtUp().pending),
	},
});
