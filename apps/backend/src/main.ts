// eslint-disable-next-line simple-import-sort/imports
import './tracing.js';

import 'reflect-metadata';

import { initDotEnv } from 'src/shared/util/env.js';
initDotEnv();

import { NestFactory } from '@nestjs/core';

import cookieParser from 'cookie-parser';
import { json, NextFunction, urlencoded } from 'express';
import { WinstonModule } from 'nest-winston';

import { mainConfig } from './config/main.config.js';
import { AllExceptionFilter } from './shared/filters/all-exception.filter.js';
import { MikroOrmExceptionFilter } from './shared/filters/mikro-orm-exceptions.filter.js';
import { logger } from './shared/lib/logger.js';
import { AppModule } from './app.module.js';

async function importHandler() {
	return new Function(`return import('../../frontend/build/handler.js')`)();
}

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule, {
		bodyParser: true,
		logger: WinstonModule.createLogger({
			instance: logger,
		}),
	});

	// TODO: Enable helmet
	// app.use(helmet({}));
	app.use(json({ limit: '50mb' }));
	app.use(urlencoded({ extended: true, limit: '2mb' }));
	app.use(cookieParser());
	app.enableCors({ credentials: true, origin: true });

	app.setGlobalPrefix('api');
	app.useGlobalFilters(new AllExceptionFilter(), new MikroOrmExceptionFilter());

	if (process.env.NODE_ENV === 'production') {
		const handler = (await importHandler()).handler;
		app.use((req: Request, res: Response, next: NextFunction) => {
			if (req.url.startsWith('/api')) return next();
			return handler(req, res, next);
		});
	}

	app.enableShutdownHooks();

	await app.listen(mainConfig.PORT);
	logger.info(`API Started on port ${mainConfig.PORT}`);
}

bootstrap().catch(e => {
	console.error(`Failed to bootstrap`, e);
});
