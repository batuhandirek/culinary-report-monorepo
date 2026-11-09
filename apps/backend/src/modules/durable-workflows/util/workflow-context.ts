import { DBOS } from '@dbos-inc/dbos-sdk';

/**
 * The id of the workflow the current call runs in, or undefined outside one (DBOS not launched
 * included). For code that tags what it stores (the LLM call ledger) without depending on the
 * module.
 */
export const currentWorkflowId = (): string | undefined => {
	try {
		return DBOS.workflowID;
	} catch {
		return undefined;
	}
};

/** Whether the current call runs inside a workflow (not inside one of its steps) */
export const inDurableWorkflow = (): boolean => {
	try {
		return DBOS.isInWorkflow();
	} catch {
		return false;
	}
};
