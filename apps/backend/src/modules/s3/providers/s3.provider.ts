import { Provider } from '@nestjs/common';

import { S3Client } from '@aws-sdk/client-s3';

import { s3Config } from '../config/s3.config.js';

export const s3Provider: Provider<S3Client> = {
	provide: S3Client,
	inject: [],
	async useFactory() {
		return new S3Client({
			region: s3Config.S3_REGION,
			endpoint: s3Config.S3_ENDPOINT,
			credentials: {
				accessKeyId: s3Config.S3_ACCESS_KEY_ID,
				secretAccessKey: s3Config.S3_SECRET_ACCESS_KEY,
			},
		});
	},
};
