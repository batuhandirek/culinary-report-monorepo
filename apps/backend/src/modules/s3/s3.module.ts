import { Module } from '@nestjs/common';

import { s3Provider } from 'src/modules/s3/providers/s3.provider.js';

@Module({
	imports: [],
	controllers: [],
	providers: [s3Provider],
	exports: [s3Provider],
})
export class S3Module {}
