import { Provider } from '@nestjs/common';

import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { Observability } from '@mastra/observability';
import { OtelExporter } from '@mastra/otel-exporter';
import { PosthogExporter } from '@mastra/posthog';

import { mainConfig } from 'src/config/main.config.js';

import { llmConfig } from '../config/llm.config.js';

export const mastraProvider: Provider<Mastra> = {
	provide: Mastra,
	inject: [],
	async useFactory() {
		const exporters = [
			mainConfig.OTEL_IS_ENABLED ?
				new OtelExporter({
					provider: {
						custom: {
							endpoint: mainConfig.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							protocol: 'http/json',
						},
					},
				})
			:	undefined,
			llmConfig.POSTHOG_LLM_EXPORT_IS_ENABLED ?
				new PosthogExporter({
					apiKey: llmConfig.POSTHOG_API_KEY,
					host: llmConfig.POSTHOG_HOST,
				})
			:	undefined,
		].filter(v => !!v);

		const mastra = new Mastra({
			workflows: {},
			agents: {},
			logger: new PinoLogger({
				level: 'error',
			}),
			// Mastra refuses an observability config without exporters, so with tracing and
			// the PostHog export both off there is none
			observability:
				exporters.length > 0 ?
					new Observability({
						configs: {
							default: {
								serviceName: 'Munchwerk',
								requestContextKeys: ['userId', 'sessionId'],
								exporters,
							},
						},
					})
				:	undefined,
		});
		return mastra;
	},
};
