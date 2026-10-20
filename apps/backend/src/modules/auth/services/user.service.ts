import { wrap } from '@mikro-orm/core';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { UserRepository } from 'src/modules/auth/repositories/user.repository.js';
import { UserSessionRepository } from 'src/modules/auth/repositories/user-session.repository.js';
import { ImageService } from 'src/modules/image/services/image.service.js';
import { NotificationPreferenceService } from 'src/modules/notification-preferences/services/notification-preference.service.js';

import {
	ASSIGNABLE_USER_ROLES,
	type AssignableUserRole,
} from '../constants/assignable-user-roles.constant.js';
import { type PromotionalChannel } from '../constants/promotional-channel.constant.js';
import { UserRoleEnum } from '../constants/user-role.enum.constant.js';
import { UpdateMeInputDto } from '../dto/update-me.input.dto.js';
import { User } from '../entities/user.entity.js';
import { acceptsPromotional } from '../util/notification-consent.js';

@Injectable()
export class UserService {
	private readonly logger = new Logger(UserService.name);
	constructor(
		private userRepository: UserRepository,
		private userSessionRepository: UserSessionRepository,
		private imageService: ImageService,
		private notificationPreferenceService: NotificationPreferenceService,
	) {}

	public async deleteUser(user: User): Promise<void> {
		const em = this.userRepository.getEntityManager();
		em.remove(user);
		await em.flush();
	}

	/**
	 * Applies `PATCH /auth/me` to the signed-in user, and flushes. Only what the body
	 * carries changes.
	 */
	public async updateMe(user: User, body: UpdateMeInputDto): Promise<void> {
		await wrap(user).init();

		const description = body.description?.trim();

		if (body.firstName) user.firstName = body.firstName;
		if (body.lastName) user.lastName = body.lastName;
		// Empty clears it
		if (description !== undefined) user.description = description || null;
		// A new photo is a data URL. The current one's own `https://…` address, sent back
		// by a form that didn't touch it, is no change — ImageKit would fetch it and store
		// it again.
		if (body.profileImage?.startsWith('data:')) {
			user.profileImage = await this.imageService.createImage(
				body.profileImage,
				'user-profile-images',
				user.id,
			);
		}
		// Can only be switched off here (see the DTO): deletion goes through `DELETE /auth/me`.
		if (body.isMarkedForDeletion === false) {
			user.isMarkedForDeletion = false;
			user.markedForDeletionAt = null;
		}
		if ('acceptedMarketing' in body) {
			user.acceptedMarketing = body.acceptedMarketing;
		}
		if ('acceptedCallCommunications' in body) {
			user.acceptedCallCommunications = body.acceptedCallCommunications;
		}
		if ('acceptedEmailCommunications' in body) {
			user.acceptedEmailCommunications = body.acceptedEmailCommunications;
		}
		if ('acceptedSmsCommunications' in body) {
			user.acceptedSmsCommunications = body.acceptedSmsCommunications;
		}
		if (body.notificationPreferences) {
			await this.notificationPreferenceService.update(user.id, body.notificationPreferences);
		}

		await this.userRepository.getEntityManager().flush();
	}

	/**
	 * Sets a user's roles from the admin panel.
	 *
	 * Three things are refused outright, because none of them can be undone from the
	 * panel afterwards: a role outside `ASSIGNABLE_USER_ROLES` (`system` above all — the
	 * DTO already excludes it, this is the runtime backstop), editing the system account
	 * itself, and an admin editing their own roles (self-demotion would lock the panel
	 * behind an account that can no longer reach it). `user` is the baseline every
	 * account carries, so it is always kept.
	 *
	 * Roles are baked into the access token, so a change only reaches the user once
	 * they get a new one: every session is dropped here, which makes the refresh fail
	 * and sends them back through login on the new roles. The access token they are
	 * holding still carries the old roles until it expires
	 * (`ACCESS_TOKEN_EXPIRES_IN_MINUTES`) — `AuthenticationGuard` decodes it without
	 * looking the session up — so a demotion is not instant, it lands within that
	 * window.
	 */
	public async updateUserRoles(
		user: User,
		roles: AssignableUserRole[],
		actingUserId: string,
	): Promise<User> {
		if (user.id === actingUserId) {
			throw new BadRequestException('You cannot change your own roles');
		}
		if (user.roles.includes(UserRoleEnum.SYSTEM)) {
			throw new BadRequestException("The system account's roles cannot be changed");
		}
		const notAssignable = (roles as UserRoleEnum[]).filter(
			role => !(ASSIGNABLE_USER_ROLES as readonly UserRoleEnum[]).includes(role),
		);
		if (notAssignable.length) {
			throw new BadRequestException(`Not assignable from here: ${notAssignable.join(', ')}`);
		}

		// `venue_owner` follows the venue memberships, not the panel: an edit here keeps it
		const derived = user.roles.filter(role => role === UserRoleEnum.VENUE_OWNER);
		user.roles = _.uniq([UserRoleEnum.USER, ...roles, ...derived]);
		await this.userRepository.getEntityManager().flush();
		await this.userSessionRepository.nativeDelete({ user });

		this.logger.log(
			`Roles of user ${user.id} set to [${user.roles.join(', ')}] by ${actingUserId}`,
		);

		return user;
	}

	/**
	 * The consent check of a promotional send: of these users, the ones a campaign may
	 * reach on this channel (`acceptsPromotional`). Every bulk promotional sender narrows
	 * its recipients through here before queueing anything.
	 */
	public async filterPromotionalRecipients(
		userIds: string[],
		channel: PromotionalChannel,
	): Promise<User[]> {
		if (userIds.length === 0) return [];
		const users = await this.userRepository.find({ id: { $in: userIds } });
		return users.filter(user => acceptsPromotional(user, channel));
	}

	/**
	 * Keeps `venue_owner` in step with the user's venue memberships; only
	 * `BrandMemberService` calls it, and the caller flushes. Unlike `updateUserRoles` it ends
	 * no session: it is granted just before the code login mints the session that carries
	 * it, other sessions pick it up on their next token refresh, and the portal's access
	 * check reads the memberships themselves, so a removal takes effect at once anyway.
	 */
	public setVenueOwnerRole(user: User, holds: boolean): void {
		const has = user.roles.includes(UserRoleEnum.VENUE_OWNER);
		if (holds && !has) user.roles = [...user.roles, UserRoleEnum.VENUE_OWNER];
		else if (!holds && has)
			user.roles = user.roles.filter(role => role !== UserRoleEnum.VENUE_OWNER);
	}

	public async getSystemUser(): Promise<User> {
		return this.userRepository.findOneOrFail({ email: 'system@culinaryreport.com' });
	}


}
