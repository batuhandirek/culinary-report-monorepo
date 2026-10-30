/** The editor's model: what reaches an owner stays on the full model (`domain-venues-and-reports`, "Models by volume"). */
export const EDITOR_MODEL = 'openai/gpt-5.4';
/** The editor's step cap (each tool round is a step) and its tool-call budget per report. */
export const EDITOR_MAX_STEPS = 12;
export const EDITOR_MAX_TOOL_CALLS = 12;
/** The whole read, shared across account failover. */
export const EDITOR_TIMEOUT_MS = 8 * 60 * 1000;
