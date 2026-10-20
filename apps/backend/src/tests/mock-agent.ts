import { jest } from '@jest/globals';

/**
 * Generic mock for any `*.agent.ts` (BaseMastraAgent subclass). Every agent exposes
 * `generate(input, context, options) → { object }`, so a mock only has to return the
 * canned `object`. Pass a fixed value or a function of the call arguments (e.g. to vary
 * the response by product / turn).
 *
 *   { provide: ProductIdentificationAgent, useValue: mockAgent({ resolvedCategoryPath: 'a/b' }) }
 *   { provide: DecomposerAgent, useValue: mockAgent({ result: { mode: 'COMMIT', products: [...] } }) }
 */
export const mockAgent = <T>(object: T | ((...args: unknown[]) => T | Promise<T>)) => ({
	generate: jest.fn(async (...args: unknown[]) => ({
		object:
			typeof object === 'function' ?
				await (object as (...a: unknown[]) => T)(...args)
			:	object,
		usage: undefined,
	})),
});

export type MockAgent = ReturnType<typeof mockAgent>;
