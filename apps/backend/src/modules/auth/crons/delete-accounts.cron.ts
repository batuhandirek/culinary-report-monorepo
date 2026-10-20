import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import moment from 'moment-timezone';

import { CronExpression } from 'src/modules/pgboss/constants/cron-expression.constant.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { ACCOUNT_DELETION_GRACE_PERIOD_DAYS } from '../constants/account-deletion.constant.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AccountNoticeService } from '../services/account-notice.service.js';
import { UserService } from '../services/user.service.js';

@Injectable()
export class DeleteAccountsCron {
	private readonly logger = new Logger(DeleteAccountsCron.name);

	constructor(
		private readonly orm: MikroORM,
		private userRepository: UserRepository,
		private userService: UserService,
		private accountNoticeService: AccountNoticeService,
	) {}

	// Runs every night. Permanently deletes accounts whose deletion grace period
	// has fully elapsed. Related entities are removed via DB-level cascades.
	@OnCron('delete-accounts', CronExpression.EVERY_DAY_AT_9PM)
	@EnsureRequestContext()
	async handleCron() {
		// An account becomes deletable on the calendar day that is GRACE days after
		// the request. We compare against the end of that day (not an exact
		// timestamp) so deletion lands on the right day regardless of run time, and
		// the open-ended bound still sweeps up any accounts a missed run left behind.
		const deletableThroughDay = moment().subtract(ACCOUNT_DELETION_GRACE_PERIOD_DAYS, 'days');
		const users = await this.userRepository.find(
			{
				isMarkedForDeletion: true,
				markedForDeletionAt: {
					$lte: deletableThroughDay.endOf('day').toDate(),
				},
			},
			{ limit: 50 },
		);

		for (const user of users) {
			this.logger.log(
				`Permanently deleting account ${user.id} ${user.firstName} ${user.lastName}`,
			);
			// Read before the delete: afterwards there is no row to ask.
			const account = { email: user.email, firstName: user.firstName };
			await this.userService.deleteUser(user);
			await this.accountNoticeService.deleted(account);
		}
	}
}
