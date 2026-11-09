/** The workflows of a report run, as `@DurableWorkflow({ name })` names them */
export const REPORT_BUILD_WORKFLOW = 'report-build';
export const REPORT_ANALYSE_WORKFLOW = 'report-analyse';
export const REPORT_RUN_WORKFLOWS: readonly string[] = [
	REPORT_BUILD_WORKFLOW,
	REPORT_ANALYSE_WORKFLOW,
];

/**
 * The event a report run publishes while no LLM account can serve its agents (`LlmWait`), and
 * `null` once one can: what the page reads to say it waits
 */
export const REPORT_LLM_WAIT_EVENT = 'llm-wait';
