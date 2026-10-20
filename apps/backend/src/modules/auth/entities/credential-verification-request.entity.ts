import { Cascade, type Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { CredentialVerificationRequestTypeEnum } from '../constants/credential-verification-request-type.enum.constant.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { CredentialVerificationRequestRepository } from '../repositories/credential-verification-request.repository.js';

import { User } from './user.entity.js';

@Entity({
	tableName: 'credential_verification_requests',
	repository: () => CredentialVerificationRequestRepository,
})
export class CredentialVerificationRequest extends MikroOrmEntityAbstractClass<
	'lastSentAt' | 'sendCount'
> {
	@Enum(() => CredentialVerificationRequestTypeEnum)
	type: CredentialVerificationRequestTypeEnum;

	@Property({ type: 'text', nullable: true })
	email?: string;

	@Property({ type: 'text', nullable: true })
	hashedPassword?: string;

	@Property({ type: 'text', nullable: true })
	mobileNumber?: string;

	@Property({ type: 'text' })
	identifier: string;

	@Property({ type: 'varchar', length: 6 })
	code: string;

	@Property({ type: 'datetime' })
	expiresAt: Date;

	@Property({ type: 'datetime', nullable: true })
	verifiedAt?: Date;

	// When `code` was last delivered. A resend refreshes this without changing `code`, so a
	// message already in flight stays valid — see `VerificationService.createOrResend`.
	@Property({ type: 'datetime', defaultRaw: 'now()' })
	lastSentAt!: Date;

	// Deliveries charged against the current throttle window (`verification-throttle.constant.ts`).
	@Property({ type: 'integer', default: 1 })
	sendCount!: number;

	@Property({ type: 'jsonb' })
	visitorInfo: Visitor;

	// Only if signup type
	@Property({ type: 'jsonb', nullable: true })
	signupInfo?: Pick<User, 'firstName' | 'lastName' | 'acceptedMarketing'>;

	/**
	 * The account this request belongs to. Set on every type — the SIGNUP_* rows get it in
	 * `verifyAndHandle`, from the user that verifying them creates — so that deleting a user
	 * takes their verification history with it (`deleteRule`). A signup row left unlinked
	 * outlives the account and keeps its old password hash and name on file.
	 *
	 * Cascade is persist/merge only: `Cascade.ALL` would make `em.remove(request)` delete the
	 * account behind it. The user → request direction is the one that should cascade, and the
	 * FK already does it.
	 */
	@ManyToOne({
		entity: () => User,
		nullable: true,
		cascade: [Cascade.PERSIST, Cascade.MERGE],
		deleteRule: 'cascade',
		updateRule: 'cascade',
	})
	user?: Rel<User>;
}
