import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { LlmCallKindEnum, LlmCallProviderEnum } from '../constants/llm-calls.constant.js';
import { LlmCallRepository } from '../repositories/llm-call.repository.js';

/**
 * One LLM call, as made: the ledger every agent, classifier and embedding call is filed in by
 * `LlmCallsService` (through `LlmModelsService.recordCall` / `DecisionModelsService.recordCall`),
 * whether it succeeded or no model could serve it. Tokens as the provider reported them, dollars
 * from the roster's prices (0 on OpenAI's allowance and OpenRouter's free models), and what the
 * caller was doing (`purpose`, `city`, `workflowId`) from the call context around it (`withLlmCallContext`).
 */
@Entity({ tableName: 'llm_calls', repository: () => LlmCallRepository })
@Index({ properties: ['createdAt'] })
@Index({ properties: ['account', 'createdAt'] })
export class LlmCall extends MikroOrmEntityAbstractClass<
	'inputTokens' | 'outputTokens' | 'cachedInputTokens' | 'cacheWriteTokens' | 'usd' | 'ok'
> {
	@Enum({ items: () => LlmCallKindEnum, nativeEnumName: 'llm_call_kind' })
	kind: LlmCallKindEnum;

	/** The agent's or classifier's id (`post-claims`, `claim-labels`), `embeddings` for an embedding */
	@Index()
	@Property({ type: 'text' })
	agentId: string;

	/** The model that answered (`res.model`); null when none could */
	@Property({ type: 'text', nullable: true })
	model?: string | null;

	/**
	 * The account that served the call (`modules/llm/accounts/*.llm-account.ts`: `openai-primary`,
	 * `openrouter`): what an account's daily limits are counted from. Null for an embedding, a
	 * decision, or a call no account answered
	 */
	@Property({ type: 'text', nullable: true })
	account?: string | null;

	@Index()
	@Enum({ items: () => LlmCallProviderEnum, nativeEnumName: 'spend_provider', nullable: true })
	provider?: LlmCallProviderEnum | null;

	@Property({ type: 'int', default: 0 })
	inputTokens: number = 0;

	@Property({ type: 'int', default: 0 })
	outputTokens: number = 0;

	/** Of `inputTokens`, read from the prompt cache */
	@Property({ type: 'int', default: 0 })
	cachedInputTokens: number = 0;

	/** Of `inputTokens`, written to the prompt cache (Claude) */
	@Property({ type: 'int', default: 0 })
	cacheWriteTokens: number = 0;

	@Property({ type: 'double', default: 0 })
	usd: number = 0;

	@Property({ type: 'int', nullable: true })
	durationMs?: number | null;

	@Property({ type: 'boolean', default: true })
	ok: boolean = true;

	@Property({ type: 'text', nullable: true })
	error?: string | null;

	/** The durable workflow the call ran in, when it did */
	@Index()
	@Property({ type: 'text', nullable: true })
	workflowId?: string | null;

	/** The city the work was for, when the caller said (`withLlmCallContext`) */
	@ManyToOne({ entity: () => City, nullable: true, deleteRule: 'set null', index: true })
	city?: Rel<City> | null;

	/** What the caller was doing: `ingest`, `pipeline:BUILD_REPORTS`, `backlog:term-topic`, `analyst` */
	@Index()
	@Property({ type: 'text', nullable: true })
	purpose?: string | null;
}
