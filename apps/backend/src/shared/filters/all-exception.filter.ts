import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common';

import { Response } from 'express';

import { mainConfig } from '../../config/main.config.js';
import { enhanceException } from '../util/exception.js';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger('AllExceptionFilter');
	constructor() {}
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const req = ctx.getRequest();
		if (mainConfig.NODE_ENV !== 'production') {
			console.log(exception);
		}
		const exceptionToThrow: any =
			exception instanceof HttpException ? exception : new InternalServerErrorException();

		const err = enhanceException(exceptionToThrow);

		if (mainConfig.NODE_ENV !== 'production') {
			console.log(err);
		}

		this.logger.error(err.message, {
			...err,
			method: req.method,
			url: req.originalUrl ?? req.url,
			headers: req.headers,
		});

		return response.status(err.status).json(err);
	}
}
