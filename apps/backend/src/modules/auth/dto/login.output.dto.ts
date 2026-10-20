export interface LoginOutputDto {
	refreshToken: string;
	expiresAt: Date;
	accessToken: string;
	accessTokenExpiresAt: Date;
}
