import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, OneToMany, OneToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { Image } from '../../image/entities/image.entity.js';
import { UserRoleEnum } from '../constants/user-role.enum.constant.js';
import { UserRepository } from '../repositories/user.repository.js';

import { CredentialVerificationRequest } from './credential-verification-request.entity.js';
import { UserSession } from './user-session.entity.js';

@Entity({
	tableName: 'users',
	repository: () => UserRepository,
})
export class User extends MikroOrmEntityAbstractClass<'publicName'> {
	@Property({ type: 'text' })
	firstName: string;

	@Property({ type: 'text' })
	lastName: string;

	@Property({ type: 'string', persist: false })
	get publicName(): string {
		// Social sign-ups can arrive without a surname
		return this.lastName ? `${this.firstName} ${this.lastName[0]}.` : this.firstName;
	}

	// A short public bio, plain text. Null when they wrote none — never an empty string
	// (`UserService.updateMe` is the only writer).
	@Property({ type: 'text', nullable: true })
	description?: string | null;

	// If signed up using email
	@Property({ type: 'text', nullable: true, unique: true })
	email?: string | null;

	@Property({ type: 'datetime', nullable: true })
	emailVerifiedAt?: Date | null;

	// If signed up using phone
	@Property({ type: 'text', nullable: true, unique: true })
	mobileNumber?: string | null;

	@Property({ type: 'datetime', nullable: true })
	mobileNumberVerifiedAt?: Date | null;

	// If signed up using email/mobile - this is null
	@Property({ type: 'text', nullable: true, hidden: true })
	hashedPassword?: string | null;

	// If signed up using email/mobile - this is null
	@Property({ type: 'datetime', nullable: true })
	passwordLastChangedAt?: Date | null;

	@Property({ type: 'boolean', nullable: true, default: false })
	isMarkedForDeletion?: boolean;

	@Property({ type: 'datetime', nullable: true })
	markedForDeletionAt?: Date | null;

	@Property({ type: 'boolean', nullable: true, default: false })
	acceptedMarketing?: boolean;

	@Property({ type: 'boolean', nullable: true, default: false })
	acceptedCallCommunications?: boolean;

	@Property({ type: 'boolean', nullable: true, default: true })
	acceptedEmailCommunications?: boolean;

	@Property({ type: 'boolean', nullable: true, default: false })
	acceptedSmsCommunications?: boolean;

	@Enum({
		array: true,
		items: () => UserRoleEnum,
		nativeEnumName: 'user_role',
	})
	roles: UserRoleEnum[];

	@OneToOne({ entity: () => Image, owner: true, nullable: true })
	profileImage?: Rel<Image>;

	@OneToMany<UserSession, User>({
		entity: () => UserSession,
		mappedBy: 'user',
	})
	sessions = new Collection<UserSession>(this);

	@OneToMany<CredentialVerificationRequest, User>({
		entity: () => CredentialVerificationRequest,
		mappedBy: 'user',
	})
	verificationRequests = new Collection<CredentialVerificationRequest>(this);
}
