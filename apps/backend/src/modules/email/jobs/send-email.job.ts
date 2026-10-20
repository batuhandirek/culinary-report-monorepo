import { SendEmailInputDto } from 'src/modules/email/dto/send-email.input.dto.js';

export type SendEmailJobPayload = SendEmailInputDto;

export class SendEmailJob {
	public static readonly jobName = 'send-email';
	constructor(public payload: SendEmailJobPayload) {}
}
