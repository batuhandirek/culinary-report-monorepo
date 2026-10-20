import { NotFoundError } from '@mikro-orm/core';

import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';

import { Response } from 'express';

import { enhanceException } from '../util/exception.js';

@Catch(NotFoundError)
export class MikroOrmExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger('MikroOrmExceptionFilter');
	constructor() {}
	catch(exception: unknown, host: ArgumentsHost) {
		let err;
		if (exception instanceof NotFoundError) {
			err = enhanceException(new NotFoundException(exception.message));
		} else err = enhanceException(new InternalServerErrorException());

		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		response.status(err.status).json(err);
	}
}
