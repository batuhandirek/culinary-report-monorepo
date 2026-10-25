import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { ReportReadyEmail, type ReportReadyEmailProps, reportReadySubject } from 'emails';

import { EmailService } from 'src/modules/email/services/email.service.js';
import { renderEmail } from 'src/modules/email/util/render-email.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { ReportShareService, shareUrl } from 'src/modules/reports/services/report-share.service.js';

import { OutreachTouchKindEnum, ProspectStageEnum } from '../constants/outreach.constant.js';
import { Prospect } from '../entities/prospect.entity.js';

import { OutreachService } from './outreach.service.js';

/** The template key a report mail is logged with. */
export const REPORT_READY_TEMPLATE = 'report-ready';

/**
 * Mails a brand that subscribed (`WON`, with a `contactEmail`) its monthly report: cover title,
 * headline, three findings and the private link, in the prospect's language. Logged as an
 * outreach touch and stamped on `Report.sentAt`.
 */
@Injectable()
export class ReportDeliveryService {
	private readonly logger = new Logger(ReportDeliveryService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly outreachService: OutreachService,
		private readonly reportService: ReportService,
		private readonly reportShareService: ReportShareService,
		private readonly emailService: EmailService,
	) {}

	/**
	 * After a build: mails the report once, when the brand subscribed and it is of the brand's
	 * newest month in its city (or across its cities, for one of those): each configuration's
	 * report of that month goes in a mail of its own. A rebuild of a report already sent, or a backfill of an older
	 * month, sends nothing. Returns whether a mail was queued.
	 */
	async deliverBuilt(reportId: string): Promise<boolean> {
		const report = await this.em.findOne(Report, { id: reportId }, { populate: ['brand', 'city'] });
		if (!report || report.sentAt) return false;
		const [newest] = await this.reportService.forBrand(report.brand.id, {
			withData: false,
			cityId: report.city?.id ?? null,
		});
		if (newest?.month !== report.month) return false;
		const prospect = await this.em.findOne(Prospect, { brand: report.brand });
		if (prospect?.stage !== ProspectStageEnum.WON || !prospect.contactEmail) return false;
		await this.send(report, prospect);
		return true;
	}

	/** "Send now" from the report page: mails it (again). Only to a subscribed brand with an address. */
	async sendNow(reportId: string): Promise<Report> {
		const report = await this.em.findOneOrFail(Report, { id: reportId }, { populate: ['brand', 'city'] });
		const prospect = await this.em.findOne(Prospect, { brand: report.brand });
		if (prospect?.stage !== ProspectStageEnum.WON)
			throw new BadRequestException(
				`${report.brand.name} has not subscribed: only a won prospect gets its report by e-mail`,
			);
		if (!prospect.contactEmail)
			throw new BadRequestException(`${report.brand.name}'s prospect has no e-mail address`);
		await this.send(report, prospect);
		return report;
	}

	private async send(report: Report, prospect: Prospect): Promise<void> {
		// A link of its own per mail, so the touch shows whether this mail's link was opened
		const share = await this.reportShareService.create(report.id);
		const props: ReportReadyEmailProps = {
			language: prospect.language,
			venueName: report.brand.name,
			month: report.month,
			contactName: prospect.contactName,
			title: report.highlights.title,
			headline: report.highlights.headline,
			findings: report.highlights.highlights.slice(0, 3),
			shareUrl: shareUrl(share.token),
		};
		const subject = reportReadySubject(props);
		// Queued first: a failure after it repeats the mail rather than losing it
		await this.emailService.queueEmail({
			to: { email: prospect.contactEmail, name: prospect.contactName ?? undefined },
			subject,
			...(await renderEmail(ReportReadyEmail, props)),
		});
		await this.outreachService.log(prospect.id, {
			kind: OutreachTouchKindEnum.EMAIL,
			subject,
			body: props.shareUrl,
			template: REPORT_READY_TEMPLATE,
			reportId: report.id,
			shareId: share.id,
		});
		report.sentAt = new Date();
		await this.em.flush();
		this.logger.log(`Mailed the ${report.month} report of ${report.brand.name} in ${report.city?.name ?? 'all its cities'}`);
	}
}
