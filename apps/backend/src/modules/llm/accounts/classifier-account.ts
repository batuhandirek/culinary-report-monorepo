/**
 * The account the classifiers' decision models run on (`DecisionModelsService`): one
 * `*.classifier-account.ts` file, its key read from its own config variable. Paid per call and
 * never held by a limit; every decision is filed in the ledger under its id (`LlmCall.account`).
 */
export interface ClassifierAccount {
	readonly id: string;
	readonly provider: 'typesafe';
	readonly apiKey: string | undefined;
}

export const defineClassifierAccount = (account: ClassifierAccount): ClassifierAccount => account;
