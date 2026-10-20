import { Injectable } from '@nestjs/common';

import dayjs from 'dayjs';
import type { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

import { RefreshTokenOutputDto } from 'src/modules/auth/dto/refresh-token.output.dto.js';

import { authConfig } from '../config/auth.config.js';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface.js';
import { ForgotPasswordTokenPayload } from '../interfaces/forgot-password-token-payload.interface.js';
import { RefreshTokenPayload } from '../interfaces/refresh-token-payload.interface.js';
import { VerificationTokenPayload } from '../interfaces/verification-token-payload.interface.js';

@Injectable()
export class JwtService {
	public async createAccessToken(
		payload: AccessTokenPayload,
		expiresInMinutes: number = authConfig.ACCESS_TOKEN_EXPIRES_IN_MINUTES,
	): Promise<RefreshTokenOutputDto> {
		const expiresAt = dayjs().add(expiresInMinutes, 'minute').toDate();
		return new Promise((resolve, reject) => {
			jwt.sign(
				{
					userId: payload.userId,
					sessionId: payload.sessionId,
					roles: payload.roles,
				},
				authConfig.JWT_SECRET!,
				{
					expiresIn: `${expiresInMinutes}m`,
				},
				(err, token) => {
					if (err) reject(err);
					else
						resolve({
							accessToken: token!,
							accessTokenExpiresAt: expiresAt,
						});
				},
			);
		});
	}

	public async createRefreshToken(
		payload: RefreshTokenPayload,
		expiresInDays: number = authConfig.REFRESH_TOKEN_EXPIRES_IN_DAYS,
	): Promise<string> {
		return new Promise((resolve, reject) => {
			jwt.sign(
				payload,
				authConfig.JWT_SECRET!,
				{
					expiresIn: `${expiresInDays} days`,
				},
				(err, token) => {
					if (err) reject(err);
					else resolve(token!);
				},
			);
		});
	}

	public async createForgotPasswordToken(payload: ForgotPasswordTokenPayload): Promise<string> {
		return new Promise((resolve, reject) => {
			jwt.sign(
				payload,
				authConfig.JWT_SECRET!,
				{ expiresIn: `${authConfig.FORGOT_PASSWORD_TOKEN_EXPIRES_IN_MINUTES}m` },
				(err, token) => {
					if (err) reject(err);
					else resolve(token!);
				},
			);
		});
	}

	public async createForVerification(
		payload: VerificationTokenPayload,
		expiresIn: SignOptions['expiresIn'],
	): Promise<string> {
		return new Promise((resolve, reject) => {
			jwt.sign(payload, authConfig.JWT_SECRET!, { expiresIn }, (err, token) => {
				if (err) reject(err);
				else resolve(token!);
			});
		});
	}

	public async createArbitraryToken<T extends object>(
		payload: T,
		expiresIn: SignOptions['expiresIn'],
	): Promise<string> {
		return new Promise((resolve, reject) => {
			jwt.sign(payload, authConfig.JWT_SECRET!, { expiresIn }, (err, token) => {
				if (err) reject(err);
				else resolve(token!);
			});
		});
	}

	public decode<T>(token: string, opts: VerifyOptions = {}): JwtPayload & T {
		return jwt.verify(token, authConfig.JWT_SECRET, opts) as JwtPayload & T;
	}
}
