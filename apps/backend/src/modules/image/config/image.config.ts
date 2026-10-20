import { IsString } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class ImageConfig {
	@IsString()
	public IMAGE_KIT_FOLDER_PREFIX: string;

	@IsString()
	public IMAGE_KIT_PUBLIC_KEY: string;

	@IsString()
	public IMAGE_KIT_PRIVATE_KEY: string;

	@IsString()
	public IMAGE_KIT_URL: string;
}

const imageConfig = validateEnv(ImageConfig);
export { imageConfig };
