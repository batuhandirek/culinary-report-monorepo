import { tags } from 'typia';

import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type { LlmSpendGroup } from '../services/llm-calls.service.js';

export interface AdminLlmSpendInputDto {
	/** First day counted (UTC); the first of the current month without */
	from?: string & tags.Format<'date'>;
	/** First day left out (UTC); tomorrow without */
	to?: string & tags.Format<'date'>;
	groupBy: LlmSpendGroup;
}

export interface AdminListLlmCallsInputDto extends PaginationRequest {
	agentId?: string;
	workflowId?: string;
	cityId?: string & tags.Format<'uuid'>;
	purpose?: string;
	/** Only the failed calls */
	failed?: boolean;
}
