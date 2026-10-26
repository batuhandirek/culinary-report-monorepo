/** Observations kept on a report, the most important first. */
export const MAX_OBSERVATIONS = 8;
/** Observations the agent investigates (the top ones). */
export const MAX_INVESTIGATIONS = 4;
/** Observations an `analysis` section shows by default, and at most. */
export const DEFAULT_OBSERVATIONS_SHOWN = 3;
export const MAX_OBSERVATIONS_SHOWN = 6;

/** The agent's step cap (each tool round is a step) and its tool-call budget per report. */
export const ANALYSIS_MAX_STEPS = 10;
export const MAX_TOOL_CALLS = 12;
/** The whole investigation, shared across account failover. */
export const ANALYSIS_TIMEOUT_MS = 8 * 60 * 1000;

export const ANALYSIS_MODEL = 'openai/gpt-5.4';
