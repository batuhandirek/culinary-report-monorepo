// The classification of press pages: hourly at :50, each page its own workflow
export const CLASSIFY_PRESS_CRON = '50 * * * *';

/** Pages a city's run starts at most */
export const CLASSIFY_PRESS_PER_RUN = 1000;

/** A page's workflow id: one run per page, whoever asks; a failed one waits for an admin's resume */
export const classifyPageWorkflowId = (pageId: string) => `classify-press.page-${pageId}`;
