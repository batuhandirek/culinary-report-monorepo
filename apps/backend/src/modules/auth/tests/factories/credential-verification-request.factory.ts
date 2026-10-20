import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { Factory } from 'fishery';

import { getEntityManager } from '../../../../shared/util/em.js';
import { CredentialVerificationRequestTypeEnum } from '../../constants/credential-verification-request-type.enum.constant.js';
import { CredentialVerificationRequest } from '../../entities/credential-verification-request.entity.js';
import { User } from '../../entities/user.entity.js';

export interface CredentialVerificationRequestTransientParams {
	password?: string;
}

class CredentialVerificationRequestFactory extends Factory<
	CredentialVerificationRequest,
	CredentialVerificationRequestTransientParams
> {
	mobileSignup(
		mobileNumber: string,
		password: string,
		signupInfo: { firstName: string; lastName: string },
		code?: string,
	) {
		return this.params({
			type: CredentialVerificationRequestTypeEnum.SIGNUP_MOBILE_NUMBER,
			mobileNumber,
			signupInfo,
			hashedPassword: bcrypt.hashSync(password, 10),
			code: code ?? faker.string.numeric(6),
		});
	}

	emailSignup(
		email: string,
		password: string,
		signupInfo: { firstName: string; lastName: string },
		code?: string,
	) {
		return this.params({
			type: CredentialVerificationRequestTypeEnum.SIGNUP_EMAIL,
			email,
			signupInfo,
			hashedPassword: bcrypt.hashSync(password, 10),
			code: code ?? faker.string.numeric(6),
		});
	}

	forgotPassword(user: User, code?: string) {
		this.params({
			type: CredentialVerificationRequestTypeEnum.FORGOT_PASSWORD,
			code: code ?? faker.string.numeric(6),
		});
		this.associations({ user });
		return this;
	}

	verified() {
		return this.params({ verifiedAt: new Date() });
	}
}

export const credentialVerificationRequestFactory = CredentialVerificationRequestFactory.define(
	({ sequence, params, associations, transientParams, onCreate }) => {
		onCreate(async req => {
			await getEntityManager().flush();
			return req;
		});

		if (!params.type) throw new Error('Cannot create without type');

		return getEntityManager().create(CredentialVerificationRequest, {
			type: CredentialVerificationRequestTypeEnum.FORGOT_PASSWORD, // Just here for no reason
			identifier: `identifier-${sequence}`,
			expiresAt: new Date(),
			code: faker.string.numeric(6),
			...params,
			...associations,
			visitorInfo: { device: { model: '' } } as any,
			signupInfo: { firstName: '', lastName: '' },
		} as CredentialVerificationRequest);
	},
);
