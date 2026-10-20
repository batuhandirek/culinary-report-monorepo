import type { Config } from 'jest';

/**
 * Single jest config for the whole backend. Runs in native ESM (the package is
 * `type: module`, and MikroORM 7 uses `import.meta`, so ESM is required — run via
 * `node --experimental-vm-modules`, wired into the `test` script).
 *
 * DB-touching tests use an in-process Postgres (PGlite) via `src/tests/pglite-orm.ts`
 * — no external database. That helper starts the embedded db per suite, so there is
 * no global DB bootstrap here (and no fake timers — the pglite socket bridge needs
 * real ones).
 */
const config: Config = {
	// tsx: the `emails` workspace package resolves to its TS source (moduleNameMapper
	// below), and its components are .tsx files.
	moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
	testRegex: '(.spec|.e2e-spec).ts$',
	extensionsToTreatAsEsm: ['.ts', '.tsx'],
	transform: {
		// 151002: cosmetic "hybrid module kind needs isolatedModules" notice under NodeNext.
		'^.+\\.(t|j)s$': ['ts-jest', { useESM: true, diagnostics: { ignoreCodes: [151002] } }],
		// KNOWN-BROKEN (see testPathIgnorePatterns below): the per-entry tsconfig
		// override here is silently DISCARDED — ts-jest caches its ConfigSet keyed by
		// the jest project config only (TsJestTransformer._cachedConfigSets), so this
		// instance reuses the .ts entry's ConfigSet (no `jsx`) and emits .tsx with the
		// JSX preserved. Probable fix: set `"jsx": "react"` in the backend tsconfig
		// (inert for .ts files) so the shared ConfigSet carries it.
		'^.+\\.tsx$': [
			'ts-jest',
			{
				useESM: true,
				diagnostics: { ignoreCodes: [151002] },
				tsconfig: { jsx: 'react', strictNullChecks: false },
			},
		],
	},
	testPathIgnorePatterns: [
		// Transitively imports the `emails` package (.tsx sources), which cannot load
		// under jest yet — see the note on the .tsx transform entry above.
		'/modules/auth/tests/services/verification.service.spec.ts$',
		// On-demand journey suites needing a live server + cloned dev DB — run via
		// `npm run backend:test:integration` (jest.integration.config.ts), never here.
		'\\.integration\\.spec\\.ts$',
	],
	maxWorkers: 1,
	// Generous: app-module suites boot pglite + build the full schema in beforeAll.
	testTimeout: 120000,
	// Dummy env before any app module (config classes validate process.env at import).
	setupFiles: ['<rootDir>/tests/env-setup.ts'],
	testEnvironment: 'node',
	rootDir: 'src',
	roots: ['<rootDir>'],
	modulePaths: ['src'],
	moduleNameMapper: {
		// Workspace packages resolve to unbuilt dist; point jest at their TS source instead.
		'^sdk$': '<rootDir>/../../../packages/sdk/src/index.ts',
		'^exceptions$': '<rootDir>/../../../packages/exceptions/src/index.ts',
		'^client$': '<rootDir>/../../../packages/client/src/index.ts',
		'^emails$': '<rootDir>/../../../packages/emails/src/index.ts',
		// libphonenumber-js's ESM entry loads its metadata through a JSON import that comes
		// back namespace-wrapped under jest-ESM, so every parse throws "metadata expected".
		// Its CJS entry reads the same metadata correctly.
		'^libphonenumber-js$': '<rootDir>/../../../node_modules/libphonenumber-js/index.cjs',
		// pgvector/mikro-orm is CJS and require()s ESM @mikro-orm/core — unsupported under
		// jest-ESM on Node < 24.9. Swap in an ESM shim with identical column types.
		'^pgvector/mikro-orm$': '<rootDir>/tests/shims/pgvector-mikro-orm.ts',
		// `src/...` path-alias imports (used across the app and entities).
		'^src/(.*)\\.js$': '<rootDir>/$1',
		'^src/(.*)$': '<rootDir>/$1',
		// NodeNext-style ".js" specifiers → their .ts sources.
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
};

export default config;
