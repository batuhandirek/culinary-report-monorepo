import { Module } from '@nestjs/common';

import { HealthCheckController } from './controllers/health-check.controller.js';

@Module({
	controllers: [HealthCheckController],
})
export class HealthCheckModule {}
