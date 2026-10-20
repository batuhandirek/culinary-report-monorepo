import { Controller } from '@nestjs/common';

import { TypedRoute } from '@nestia/core';

import { HealthCheckResponseDto } from '../dto/health-check.output.dto.js';

@Controller('/health-check')
export class HealthCheckController {
	private readonly since: Date;
	constructor() {
		this.since = new Date();
	}

	@TypedRoute.Get('/')
	public async checkStatus(): Promise<HealthCheckResponseDto> {
		return {
			ok: true,
			since: this.since,
		};
	}
}
