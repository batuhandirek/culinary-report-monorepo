import { Inject, Logger } from '@nestjs/common';

import {
	Classifier,
	type ClassifierQuestions,
	type ClassifierResult,
	type ClassifierState,
} from '@mastra/core/classifier';

import { llmConfig } from '../config/llm.config.js';
import { decisionCostUsd, type DecisionModelId } from '../constants/decision-models.constant.js';
import { DecisionModelsService } from '../services/decision-models.service.js';

// A decision is one short call (70-500 ms reported); a stalled socket must not hold a pool for long
const DEFAULT_DECIDE_TIMEOUT_MS = 60_000;

export interface BaseMastraClassifierConfig {
	id: string;
	name: string;
	verbose?: boolean;
	/**
	 * May run outside `llmPaid`, in production, paid per call: only a classifier the user allowed by
	 * name (2026-11-05: `claim-labels`, after the eval). Every other one runs only in work started by hand.
	 */
	paidInProduction?: boolean;
	/** Reads one source's facts (a claim's labels): keeps running while `LLM_INGESTION_ONLY` pauses the rest */
	ingestion?: boolean;
}

/** A call's own options; `model` picks the model for this call over the classifier's `getModel()` */
export interface MastraDecideOptions {
	model?: DecisionModelId;
	abortSignal?: AbortSignal;
}

/** The answers, the model that gave them and what the call cost */
export type MastraDecideResult<Questions extends ClassifierQuestions> =
	ClassifierResult<Questions> & {
		model: DecisionModelId;
		usd: number;
	};

/**
 * What `*.agent.ts` is for a language model, `*.classifier.ts` is for a decision model: declared
 * questions (pick one option of a set, a score, yes or no) answered about one state with
 * probabilities, and no text (`@mastra/core/classifier`). A classifier's questions are its rules:
 * fixed per context, the item in the state, one item a call. Decision models are paid
 * (`DecisionModelsService`), so a classifier runs only inside `llmPaid` unless the user allowed
 * it in production (`paidInProduction`).
 */
export abstract class BaseMastraClassifier<
	Questions extends ClassifierQuestions,
	Context extends object = Record<string, never>,
> {
	@Inject(DecisionModelsService) protected readonly decisionModels!: DecisionModelsService;
	protected abstract readonly config: BaseMastraClassifierConfig;
	private _logger?: Logger;
	protected get logger(): Logger {
		return (this._logger ??= new Logger(this.config.name));
	}

	/** The questions as the model is asked them, as text: the classifier's rules */
	rulesFor(context?: Context): string {
		return JSON.stringify(this.getQuestions(context));
	}

	/** The questions, with each option's description: what the right answer is */
	protected abstract getQuestions(context?: Context): Questions;
	/** The decision model the classifier runs on unless a call picks another */
	protected abstract getModel(context?: Context): DecisionModelId;

	async decide(
		state: ClassifierState,
		context?: Context,
		options?: MastraDecideOptions,
	): Promise<MastraDecideResult<Questions>> {
		const model = options?.model ?? this.getModel(context);
		const classifier = new Classifier({
			id: this.config.id,
			model: this.decisionModels.model(model, {
				inProduction: this.config.paidInProduction,
				ingestion: this.config.ingestion,
			}),
		});
		const start = Date.now();
		try {
			const res = await classifier.decide({
				state,
				questions: this.getQuestions(context),
				abortSignal: options?.abortSignal ?? AbortSignal.timeout(DEFAULT_DECIDE_TIMEOUT_MS),
			});
			const usd = decisionCostUsd(model, res.usage);
			if (llmConfig.IS_LLM_VERBOSE || this.config.verbose)
				this.logger.debug(
					`Decided by ${model} in ${Date.now() - start}ms, ${res.usage.inputTokens ?? '?'} in, $${usd.toFixed(5)}, answers=${JSON.stringify(res.answers)}`,
				);
			return Object.assign(res, { model, usd });
		} catch (error) {
			this.logger.error(`Error during decide: ${(error as Error).message}`);
			throw error;
		}
	}
}
