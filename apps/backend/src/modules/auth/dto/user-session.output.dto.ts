import { UserSession } from '../entities/user-session.entity.js';

export interface UserSessionOutputDto extends Omit<UserSession, 'user'> {}
