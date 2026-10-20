import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';

export interface AdminExportUsersCsvInputDto {
	roles?: UserRoleEnum[];
}
