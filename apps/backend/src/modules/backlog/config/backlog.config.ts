import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class BacklogConfig {
	/**
	 * Tokens the daily LLM backlog run may spend over all backlogs together. Well under an
	 * account's 10M free daily allowance on mini, so the pipeline's own extraction and analysis
	 * keep their room.
	 */
	@IsNumber()
	@Min(0)
	@IsOptional()
	@Transform(v => Number(v.value))
	public LLM_BACKLOG_DAILY_TOKENS: number = 3_000_000;

	/**
	 * Lets the backlogs use the roster's paid models (Claude), for a while: the user's yes to
	 * spend. Off, a backlog runs on the free allowance only (`llmFreeOnly`).
	 * `LLM_BACKLOG_DAILY_TOKENS` still caps a day, and then caps money.
	 */
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === true || v.value === 'true')
	public LLM_BACKLOG_ALLOW_PAID: boolean = false;
}

const backlogConfig = validateEnv(BacklogConfig);
export { backlogConfig };
