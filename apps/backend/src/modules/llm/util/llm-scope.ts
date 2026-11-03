import { AsyncLocalStorage } from 'node:async_hooks';

const scope = new AsyncLocalStorage<{ paid: true }>();

/**
 * Runs `fn` with the roster's paid models (Claude) allowed: every agent call inside it, however
 * deep, may move to them. Only for work the user starts by hand and means to pay for (the eval's
 * Opus references and rulings). Everywhere else, production included, only the free models run
 * (OpenAI's allowance) and a call fails once it is out instead of spending.
 */
export const llmPaid = <T>(fn: () => Promise<T>): Promise<T> => scope.run({ paid: true }, fn);

export const isLlmPaid = (): boolean => scope.getStore()?.paid === true;
