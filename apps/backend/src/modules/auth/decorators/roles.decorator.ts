import { SetMetadata } from '@nestjs/common';

import { ROLES_METADATA_KEY } from '../constants/roles-guard-metadata-key.constant.js';
import { UserRoleEnum } from '../constants/user-role.enum.constant.js';

export const Roles = (...roles: UserRoleEnum[]) => SetMetadata(ROLES_METADATA_KEY, roles);
