import { jest } from '@jest/globals';

/**
 * Generic mock for any `*.agent.ts` (BaseMastraAgent subclass). Every agent exposes
 * `generate(input, context, options) → { object, model }`, so a mock only has to return the
 * canned `object`; `model` (the model that answered) is `MOCK_AGENT_MODEL`. Pass a fixed value or a function of the call arguments (e.g. to vary
 * the response by product / turn).
 *
 *   { provide: ProductIdentificationAgent, useValue: mockAgent({ resolvedCategoryPath: 'a/b' }) }
 *   { provide: DecomposerAgent, useValue: mockAgent({ result: { mode: 'COMMIT', products: [...] } }) }
 */
export const MOCK_AGENT_MODEL = 'openai/mock-model';

export const mockAgent = <T>(object: T | ((...args: unknown[]) => T | Promise<T>)) => ({
	generate: jest.fn(
		async (...args: unknown[]): Promise<{ object: T; usage: undefined; model?: string }> => ({
			object:
				typeof object === 'function' ?
					await (object as (...a: unknown[]) => T)(...args)
				:	object,
			usage: undefined,
			model: MOCK_AGENT_MODEL,
		}),
	),
});

export type MockAgent = ReturnType<typeof mockAgent>;
