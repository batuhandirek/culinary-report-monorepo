import { Injectable, Logger } from '@nestjs/common';

import axios, { AxiosInstance } from 'axios';
import { JobWithMetadata } from 'pg-boss';

import { OnBatchJob } from 'src/modules/pgboss/decorators/on-batch-job.decorator.js';

import { smsConfig } from '../config/sms.config.js';
import { SendSmsJob, SendSmsJobPayload } from '../jobs/send-sms.job.js';

/*
VERIMOR SPECIFIC DOCS: 
API üzerinden dakikada 240 sms gönderim isteği yapabilirsiniz. 1 isteğin büyüklüğü 10 MB geçemez. Bu limitler dahilinde, isteğin yapısına bağlı olmakla birlikte dakikada 100.000.000 mesaj gönderilebilir.
Yoğun OTP gönderimleri için kendi tarafınızda istekleri biriktirip saniyede bir post yöntemiyle sms gönderim isteği (çok kişiye çok mesaj isteği) yapmalısınız.
Request limitlerini aştığınızda 429 (Too Many Requests) hatası döner.
Paket boyutu limitini aştığınızda 413 (Request Entity Too Large) hatası döner.
API üzerinden sms raporu sorgulama isteği dakikada 20 istekle sınırlandırılmıştır. Önerimiz Push yöntemini kullanmanızdır.
HTTPS olarak API’mizi kullanırken SSL bağlanıtısı için kullandığınız kütüphane sisteminizde kök sertifikalar yüklü olmadığından sertifikamızı doğrulamayabilir. Bu sorunu çözmek için lets-encrypt-r3.crt kök sertifika dosyasını buraya tıklayarak indirip sisteminize kurmalısınız.
Mesaj metninde yeni satıra geçiş yapabilmek için json'da (new line) "\n" kullanımı gerekmektedir.
*/

@Injectable()
export class SendSmsWorker {
	private readonly logger = new Logger(SendSmsWorker.name);
	private readonly client: AxiosInstance;

	constructor() {
		this.client = axios.create({
			baseURL: 'https://sms.verimor.com.tr',
			timeout: 10000,
		});
	}

	@OnBatchJob(SendSmsJob.jobName, { batchSize: 240, pollingIntervalSeconds: 5, retryLimit: 5 })
	async onSendSmsJob(jobs: JobWithMetadata<SendSmsJobPayload>[]) {
		this.logger.log(`Sending ${jobs.length} SMS message(s)`);

		if (smsConfig.SMS_IS_DISABLED) {
			this.logger.log(`SMS was disabled, not sending ${jobs.length} SMS message(s)`);
			return;
		}

		await this.client.post('/v2/send.json', {
			username: smsConfig.VERIMOR_USERNAME,
			password: smsConfig.VERIMOR_PASSWORD,
			datacoding: '1',
			messages: jobs.map(job => ({
				msg: job.data.message,
				dest: job.data.to.replace('+', ''),
			})),
		});
	}
}
