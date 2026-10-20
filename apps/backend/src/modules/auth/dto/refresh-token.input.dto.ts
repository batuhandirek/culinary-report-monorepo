export interface RefreshTokenInputDto {
	/**
	 * Optional since the `refreshToken` cookie is accepted as a fallback; a value sent here
	 * takes precedence over the cookie.
	 */
	refreshToken?: string;
}
