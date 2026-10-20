import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { config as dotEnvConfig } from 'dotenv';
import * as path from 'node:path';

export function initDotEnv() {
	const environment = process.env.NODE_ENV;
	const envFileName =
		environment === 'development' ? '.env.local'
		: environment === 'production' ? '.env'
		: environment === 'test' ? '.env.test'
		: undefined;

	if (!envFileName) {
		console.log(`Cannot find env file path for ${process.env.NODE_ENV}, skipping loading it`);
		return;
	}

	const envPath = path.resolve(
		import.meta.dirname,
		'..',
		'..',
		'..',
		'..',
		'..',
		'env',
		'server',
		envFileName,
	);
	console.log(`Using "${envFileName}" for environment "${process.env.NODE_ENV}": ${envPath}`);
	dotEnvConfig({ path: envPath, quiet: true });
}
initDotEnv();

export function validateEnv<T>(envDto: ClassConstructor<T>): T {
	const validatedConfig = plainToInstance(envDto, process.env, {
		exposeDefaultValues: true,
	});

	const errors = validateSync(validatedConfig as object, {
		skipMissingProperties: false,
	});

	if (errors.length > 0) {
		const errMessages: string[] = [];

		errors.forEach(e => {
			const errConstraints = e.constraints as { [type: string]: string };
			for (const errMessage of Object.values(errConstraints)) {
				errMessages.push(errMessage);
			}
		});

		throw new Error(`Config initialization error: \n${errMessages.join(',\n')}`);
	}

	return validatedConfig;
}
