import { BrandMemberRoleEnum } from '../constants/brand-member-role.enum.constant.js';

/** One brand the signed-in person may open in the portal. */
export interface BrandMembershipOutputDto {
	id: string;
	role: BrandMemberRoleEnum;
	/** Their first sign-in after the invite; absent while it is open. */
	acceptedAt?: Date;
	brand: {
		id: string;
		name: string;
		/** Its places, to tell two brands of one name apart */
		branches: {
			id: string;
			name: string;
			/** Google's city or locality */
			locality?: string;
			district?: string;
		}[];
	};
}
