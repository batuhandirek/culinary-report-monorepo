import { AsyncLocalStorage } from 'node:async_hooks';

const scope = new AsyncLocalStorage<{ freeOnly: true }>();

/**
 * Runs `fn` with only the free models of the roster (OpenAI's allowance): every agent call
 * inside it, however deep, skips the paid ones (`isPaidModel`) and fails once the allowance is out
 * instead of spending. The daily backlogs run in it.
 */
export const llmFreeOnly = <T>(fn: () => Promise<T>): Promise<T> => scope.run({ freeOnly: true }, fn);

export const isLlmFreeOnly = (): boolean => scope.getStore()?.freeOnly === true;
