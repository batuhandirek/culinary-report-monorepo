import { Transform } from 'class-transformer';
import {
	IsBoolean,
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	ValidateIf,
} from 'class-validator';

import { initDotEnv, validateEnv } from 'src/shared/util/env.js';

export class EnvironmentVariables {
	@IsString()
	@IsNotEmpty()
	@IsEnum(['development', 'production', 'test'])
	public NODE_ENV: 'development' | 'production' | 'test';

	@IsNumber()
	@IsNotEmpty()
	@Transform(({ value }: { value: number }) => Number(value))
	public PORT: number = 3000;

	@IsString()
	@IsNotEmpty()
	public DB_HOST: string;

	@IsNumber()
	@Transform(v => Number(v.value))
	public DB_PORT: number;

	@IsString()
	@IsNotEmpty()
	public DB_USERNAME: string;

	@IsBoolean()
	@Transform(v => v.value === 'true')
	public DB_SSL: boolean;

	@IsString()
	@IsOptional()
	public DB_PASSWORD?: string;

	@IsString()
	@IsNotEmpty()
	public DB_NAME: string;

	@IsString()
	public PUBLIC_API_URL: string;

	@IsString()
	public PUBLIC_APP_URL: string;

	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public OTEL_IS_ENABLED: boolean = false;

	@IsString()
	@IsNotEmpty()
	@ValidateIf((obj: EnvironmentVariables) => {
		return obj.OTEL_IS_ENABLED;
	})
	public OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: string;

	@IsString()
	@IsNotEmpty()
	@ValidateIf((obj: EnvironmentVariables) => {
		return obj.OTEL_IS_ENABLED;
	})
	public OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: string;
}

initDotEnv();
const mainConfig = validateEnv(EnvironmentVariables);
export { mainConfig };
