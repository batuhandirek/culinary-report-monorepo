/** One single-use client-side upload to ImageKit (see `ImageService.createUploadTokens`). */
export interface ImageUploadToken {
	token: string;
	// Must be sent to ImageKit exactly as given — both are signed into the token.
	fileName: string;
	folder: string;
	expiresAt: Date;
}
