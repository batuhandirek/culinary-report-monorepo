import { NestFactory } from '@nestjs/core';

import { INestiaConfig } from '@nestia/sdk';

import { AppModule } from './src/app.module';

const config: INestiaConfig = {
	input: () => NestFactory.create(AppModule),
	swagger: {
		openapi: '3.0',
		output: './swagger.json',
		beautify: true,
		security: {},
		servers: [],
		operationId: props => {
			return props.function;
		},
	},
};

export default config;
