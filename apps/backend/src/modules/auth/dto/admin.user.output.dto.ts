import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { CredentialVerificationRequest } from 'src/modules/auth/entities/credential-verification-request.entity.js';
import { ImageOutputDto } from 'src/modules/image/dto/image.output.dto.js';

export interface AdminUserOutputDto {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	firstName: string;
	lastName: string;
	email?: string | null;
	emailVerifiedAt?: Date | null;
	mobileNumber?: string | null;
	mobileNumberVerifiedAt?: Date | null;
	passwordLastChangedAt?: Date | null;
	isMarkedForDeletion?: boolean;
	markedForDeletionAt?: Date | boolean | null;
	acceptedMarketing?: boolean;
	acceptedCallCommunications?: boolean;
	acceptedEmailCommunications?: boolean;
	acceptedSmsCommunications?: boolean;
	roles: UserRoleEnum[];
	profileImage?: ImageOutputDto;
	verificationRequests?: Partial<Omit<CredentialVerificationRequest, 'user'>>[];
}
