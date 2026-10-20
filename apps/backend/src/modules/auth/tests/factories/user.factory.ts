import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { Factory } from 'fishery';

import { getEntityManager } from 'src/shared/util/em.js';

import { UserRoleEnum } from '../../constants/user-role.enum.constant.js';
import { User } from '../../entities/user.entity.js';

import { credentialVerificationRequestFactory } from './credential-verification-request.factory.js';

export interface UserTransientParams {
	password?: string;
}

export class UserFactory extends Factory<User, UserTransientParams, User> {
	user() {
		return this.params({
			roles: [UserRoleEnum.USER],
		});
	}

	admin() {
		return this.params({
			roles: [UserRoleEnum.USER, UserRoleEnum.ADMIN],
		});
	}

	systemUser() {
		return this.params({
			roles: [UserRoleEnum.SYSTEM],
		});
	}

	signedUpWithMobile(
		mobileNumber: string,
		password: string,
		optional: {
			firstName?: string;
			lastName?: string;
		} = {},
	) {
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		return this.params({
			mobileNumber,
			mobileNumberVerifiedAt: new Date(),
			passwordLastChangedAt: new Date(),
			firstName,
			lastName,
			...optional,
		})
			.transient({ password })
			.afterBuild((user: User) => {
				const verificationRequest = credentialVerificationRequestFactory
					.mobileSignup(mobileNumber, password, { firstName, lastName })
					.verified()
					.associations({ user })
					.build();

				user.verificationRequests.add(verificationRequest);
			});
	}

	signedUpWithEmail(
		email: string,
		password: string,
		optional: {
			firstName?: string;
			lastName?: string;
		} = {},
	) {
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		return this.params({
			email,
			emailVerifiedAt: new Date(),
			passwordLastChangedAt: new Date(),
			firstName,
			lastName,
			...optional,
		})
			.transient({ password })
			.afterBuild((user: User) => {
				const verificationRequest = credentialVerificationRequestFactory
					.emailSignup(email, password, { firstName, lastName })
					.verified()
					.associations({ user })
					.build();

				user.verificationRequests.add(verificationRequest);
			});
	}
}

export const userFactory = UserFactory.define(
	({ params, transientParams, associations, onCreate }) => {
		onCreate(async (user: User) => {
			await getEntityManager().flush();
			return user;
		});

		const hashedPassword = bcrypt.hashSync(
			transientParams.password ?? faker.internet.password(),
			10,
		);
		const toCreate = {
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			createdAt: new Date(),
			updatedAt: new Date(),
			passwordLastChangedAt: new Date(),
			roles: [UserRoleEnum.USER],
			...params,
			...associations,
			hashedPassword,
		} as User;

		return getEntityManager().create(User, toCreate);
	},
);
