import { Global, Module } from '@nestjs/common';

import { TurnstileService } from './services/turnstile.service.js';

/**
 * Global so `@UseGuards(TurnstileGuard)` resolves in any module without
 * having to import TurnstileModule there.
 */
@Global()
@Module({
	providers: [TurnstileService],
	exports: [TurnstileService],
})
export class TurnstileModule {}
