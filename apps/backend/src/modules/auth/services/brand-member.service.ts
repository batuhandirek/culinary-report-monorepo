import { QueryOrder } from '@mikro-orm/core';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PortalInviteEmail, type PortalInviteLanguage, portalInviteSubject } from 'emails';

import { mainConfig } from 'src/config/main.config.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { renderEmail } from 'src/modules/email/util/render-email.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';

import { UserRoleEnum } from '../constants/user-role.enum.constant.js';
import { BrandMemberRoleEnum } from '../constants/brand-member-role.enum.constant.js';
import { User } from '../entities/user.entity.js';
import { BrandMember } from '../entities/brand-member.entity.js';
import { UserRepository } from '../repositories/user.repository.js';
import { BrandMemberRepository } from '../repositories/brand-member.repository.js';

import { UserService } from './user.service.js';

export interface BrandInvite {
	brandId: string;
	email: string;
	/** The person's name when we know it (the prospect's contact); names a new account. */
	name?: string | null;
	role?: BrandMemberRoleEnum;
	invitedById?: string;
	/** The invite mail's language: the prospect's. */
	language?: PortalInviteLanguage;
}

/** The portal's sign-in page with the address filled in: the link every invite carries. */
export const portalLoginUrl = (email: string) =>
	`${mainConfig.PUBLIC_APP_URL}/portal/login?email=${encodeURIComponent(email)}`;

/**
 * Who may open which brand's portal. The one entry point for memberships: invite, accept and
 * remove go through here, and so does the `venue_owner` role that follows them.
 */
@Injectable()
export class BrandMemberService {
	private readonly logger = new Logger(BrandMemberService.name);

	constructor(
		private readonly brandMemberRepository: BrandMemberRepository,
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly emailService: EmailService,
	) {}

	private get em() {
		return this.brandMemberRepository.getEntityManager();
	}

	/**
	 * Gives `email` access to the brand's portal and mails them the link. An address without
	 * an account gets one with no password (it signs in by e-mail code only). Inviting again
	 * keeps the one membership and sends the mail again.
	 */
	async invite(input: BrandInvite): Promise<BrandMember> {
		const email = input.email.toLowerCase().trim();
		const brand = await this.em.findOneOrFail(Brand, { id: input.brandId });

		let user = await this.userRepository.findOne({ email });
		if (!user) {
			const [firstName, ...rest] = (input.name?.trim() || email.split('@')[0]).split(/\s+/);
			user = this.userRepository.create({
				email,
				firstName,
				lastName: rest.join(' '),
				roles: [UserRoleEnum.USER],
			});
			this.logger.log(`Created a passwordless account for a portal invite to ${brand.id}`);
		}

		let member = await this.brandMemberRepository.findOne({ user, brand });
		if (!member) {
			member = this.brandMemberRepository.create({
				user,
				brand,
				role: input.role ?? BrandMemberRoleEnum.OWNER,
			});
		} else if (input.role) {
			member.role = input.role;
		}
		if (input.invitedById) member.invitedBy = this.userRepository.getReference(input.invitedById);
		await this.em.flush();

		const language = input.language ?? 'en';
		await this.emailService.queueEmail({
			subject: portalInviteSubject(brand.name, language),
			...(await renderEmail(PortalInviteEmail, {
				venueName: brand.name,
				loginUrl: portalLoginUrl(email),
				lang: language,
			})),
			to: { email },
		});
		return member;
	}

	/**
	 * Accepts every open invite of the user — their first sign-in by code — and hands them
	 * the `venue_owner` role while they hold a membership. Flushes.
	 */
	async acceptInvites(user: User): Promise<void> {
		const memberships = await this.brandMemberRepository.find({ user });
		const now = new Date();
		for (const member of memberships) member.acceptedAt ??= now;
		this.userService.setVenueOwnerRole(user, memberships.length > 0);
		await this.em.flush();
	}

	/** Takes the person off the brand; their last membership takes the role with it. */
	async remove(brandId: string, memberId: string): Promise<void> {
		const member = await this.brandMemberRepository.findOne(
			{ id: memberId, brand: brandId },
			{ populate: ['user'] },
		);
		if (!member) throw new NotFoundException();
		const user = member.user;
		this.em.remove(member);
		await this.em.flush();
		const left = await this.brandMemberRepository.count({ user });
		this.userService.setVenueOwnerRole(user, left > 0);
		await this.em.flush();
	}

	/** The brand's people, invited first first. */
	async listForBrand(brandId: string): Promise<BrandMember[]> {
		return this.brandMemberRepository.find(
			{ brand: brandId },
			{ populate: ['user'], orderBy: { createdAt: QueryOrder.ASC } },
		);
	}

	/** The brands a user is a member of, by name, with their branches. */
	async membershipsOf(userId: string): Promise<BrandMember[]> {
		return this.brandMemberRepository.find(
			{ user: userId },
			{ populate: ['brand', 'brand.branches'], orderBy: { brand: { name: QueryOrder.ASC } } },
		);
	}

	/** Whether the user may open this brand's portal: a member, or an admin (any brand). */
	async canAccess(userId: string, roles: UserRoleEnum[], brandId: string): Promise<boolean> {
		if (roles.includes(UserRoleEnum.ADMIN)) return true;
		return (await this.brandMemberRepository.count({ user: userId, brand: brandId })) > 0;
	}
}
