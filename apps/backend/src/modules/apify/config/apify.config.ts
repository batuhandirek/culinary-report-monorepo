import { IsOptional, IsString } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class ApifyConfig {
	// Optional so the app boots without it; `ApifyService` refuses to run an actor then
	@IsString()
	@IsOptional()
	public APIFY_TOKEN?: string;
}

const apifyConfig = validateEnv(ApifyConfig);
export { apifyConfig };
