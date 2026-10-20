export interface SendSmsJobPayload {
	to: string;
	message: string;
}

export class SendSmsJob {
	public static readonly jobName = 'send-sms';
	constructor(public payload: SendSmsJobPayload) {}
}
