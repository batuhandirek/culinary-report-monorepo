import { IsString } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class S3Config {
	@IsString()
	public S3_REGION: string;

	@IsString()
	public S3_ENDPOINT: string;

	@IsString()
	public S3_ACCESS_KEY_ID: string;

	@IsString()
	public S3_SECRET_ACCESS_KEY: string;
}

const s3Config = validateEnv(S3Config);
export { s3Config };
