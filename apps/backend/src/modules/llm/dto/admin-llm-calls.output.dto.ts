import type { AdminCityRefOutputDto } from 'src/modules/cities/dto/admin-city.output.dto.js';
import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

import { LlmCallKindEnum, LlmCallProviderEnum } from '../constants/llm-calls.constant.js';
import type { LlmSpendGroup } from '../services/llm-calls.service.js';

export interface AdminLlmSpendRowOutputDto {
	/** The group's value: an agent id, a model, a day, a city id, a purpose, a workflow id */
	key: string;
	calls: number;
	failed: number;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	usd: number;
}

export interface AdminLlmSpendOutputDto {
	from: Date;
	to: Date;
	groupBy: LlmSpendGroup;
	rows: AdminLlmSpendRowOutputDto[];
	total: AdminLlmSpendRowOutputDto;
}

export interface AdminLlmCallOutputDto {
	id: string;
	createdAt: Date;
	kind: LlmCallKindEnum;
	agentId: string;
	model?: string;
	provider?: LlmCallProviderEnum;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	cacheWriteTokens: number;
	usd: number;
	durationMs?: number;
	ok: boolean;
	error?: string;
	workflowId?: string;
	city?: AdminCityRefOutputDto;
	purpose?: string;
}

export interface AdminListLlmCallsOutputDto extends PaginatedResult<AdminLlmCallOutputDto> {}
