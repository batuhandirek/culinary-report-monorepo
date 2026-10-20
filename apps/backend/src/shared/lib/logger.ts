import { context, trace } from '@opentelemetry/api';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import winston, { createLogger } from 'winston';

import { mainConfig } from '../../config/main.config.js';

const traceContext = winston.format(info => {
	const span = trace.getSpan(context.active());
	if (span) {
		const { traceId, spanId } = span.spanContext();
		info['trace_id'] = traceId;
		info['span_id'] = spanId;
	}
	return info;
});

const transports: winston.transport[] = [new winston.transports.Console()];

if (mainConfig.OTEL_IS_ENABLED) {
	transports.push(new OpenTelemetryTransportV3({ level: 'info' }));
}

export const logger = createLogger({
	level: mainConfig['LOG_LEVEL'] ?? 'debug',
	format:
		mainConfig.NODE_ENV === 'development' ?
			winston.format.combine(traceContext(), winston.format.simple())
		:	winston.format.combine(traceContext(), winston.format.json()),
	transports,
	handleExceptions: true,
	handleRejections: true,
});
