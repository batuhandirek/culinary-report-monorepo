import { tags } from 'typia';

import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type { DurablePriority } from '../constants/durable-priority.constant.js';

import type { DurableWorkflowStatus } from './admin-workflows.output.dto.js';

export interface AdminListWorkflowsInputDto extends PaginationRequest {
	status?: DurableWorkflowStatus;
	/** The registered workflow name (the method's), e.g. `ingestCity` */
	name?: string;
	queue?: string;
	schedule?: string;
	/** `key:value` of a workflow attribute, e.g. `cityId:<uuid>` */
	attribute?: string & tags.Pattern<'^[^:]+:.+$'>;
}

export interface AdminSetWorkflowPriorityInputDto {
	/** `high` takes it, and every live run under it, off its queue before the `normal` and `low` runs waiting */
	priority: DurablePriority;
}

export interface AdminForkWorkflowInputDto {
	/** The step the new run starts afresh from (0 = the first); the steps before it are copied */
	startStep: number & tags.Type<'uint32'>;
}
