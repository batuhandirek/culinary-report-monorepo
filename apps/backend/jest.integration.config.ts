import type { Config } from 'jest';

/**
 * Config for the on-demand integration (user-journey) suites — run via
 * `npm run backend:test:integration` (repo root), never as part of the default
 * `backend:test` run (jest.config.ts ignores `*.integration.spec.ts`).
 *
 * These suites are black-box: they only import the generated `client` package
 * and helpers, and talk HTTP to a real server (spawned by
 * `bin/run-integration-tests.sh` against a clone of the dev database). No
 * PGlite, no app modules, no dummy-env setup.
 */
const config: Config = {
	moduleFileExtensions: ['js', 'json', 'ts'],
	testRegex: '\\.integration\\.spec\\.ts$',
	extensionsToTreatAsEsm: ['.ts'],
	transform: {
		'^.+\\.(t|j)s$': ['ts-jest', { useESM: true, diagnostics: { ignoreCodes: [151002] } }],
	},
	maxWorkers: 1,
	// Journeys drive a live server (which may call real LLM providers) — be generous.
	testTimeout: 300000,
	testEnvironment: 'node',
	rootDir: 'src',
	roots: ['<rootDir>'],
	modulePaths: ['src'],
	moduleNameMapper: {
		// Workspace packages resolve to unbuilt dist; point jest at their TS source instead.
		'^sdk$': '<rootDir>/../../../packages/sdk/src/index.ts',
		'^client$': '<rootDir>/../../../packages/client/src/index.ts',
		// `src/...` path-alias imports.
		'^src/(.*)\\.js$': '<rootDir>/$1',
		'^src/(.*)$': '<rootDir>/$1',
		// NodeNext-style ".js" specifiers → their .ts sources.
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
};

export default config;
