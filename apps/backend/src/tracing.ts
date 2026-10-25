import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';

import { mainConfig } from 'src/config/main.config.js';

let sdk: NodeSDK | undefined;

if (mainConfig.OTEL_IS_ENABLED && !sdk) {
	sdk = new NodeSDK({
		serviceName: 'Munchwerk',
		traceExporter: new OTLPTraceExporter({
			url: mainConfig.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
		}),
		logRecordProcessors: [
			new BatchLogRecordProcessor(
				new OTLPLogExporter({
					url: mainConfig.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
				}),
			),
		],
		instrumentations: [
			getNodeAutoInstrumentations({
				'@opentelemetry/instrumentation-fs': { enabled: false },
				'@opentelemetry/instrumentation-winston': { enabled: false },
				'@opentelemetry/instrumentation-http': {
					enabled: true,
					ignoreIncomingRequestHook: req => {
						return (
							req.url?.includes('/health-check') ||
							req.url?.includes('/metrics') ||
							false
						);
					},
				},
			}),
		],
	});
	sdk.start();
}

export default sdk;
