import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { BrandMemberRoleEnum } from '../constants/brand-member-role.enum.constant.js';
import { BrandMemberRepository } from '../repositories/brand-member.repository.js';

import { User } from './user.entity.js';

/**
 * A person who may open a brand's portal (`/portal`): every branch of it. Made by an admin's invite, accepted by
 * the person's first sign-in with an e-mail code. Changed only through `BrandMemberService`.
 */
@Entity({ tableName: 'brand_members', repository: () => BrandMemberRepository })
@Unique({ properties: ['user', 'brand'] })
export class BrandMember extends MikroOrmEntityAbstractClass<'role'> {
	@ManyToOne({ entity: () => User, deleteRule: 'cascade', index: true })
	user: Rel<User>;

	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade', index: true })
	brand: Rel<Brand>;

	@Enum({ items: () => BrandMemberRoleEnum, nativeEnumName: 'brand_member_role' })
	role: BrandMemberRoleEnum = BrandMemberRoleEnum.OWNER;

	// The admin who sent the invite
	@ManyToOne({ entity: () => User, nullable: true, deleteRule: 'set null' })
	invitedBy?: Rel<User> | null;

	// The first sign-in after the invite; empty while the invite is open
	@Property({ type: 'datetime', nullable: true })
	acceptedAt?: Date | null;
}
