import { Injectable } from '@nestjs/common';

import bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
	public async hashPassword(plain: string): Promise<string> {
		return bcrypt.hash(plain, 10);
	}

	public async comparePassword(plain: string, hashed: string): Promise<boolean> {
		return bcrypt.compare(plain, hashed);
	}
}
