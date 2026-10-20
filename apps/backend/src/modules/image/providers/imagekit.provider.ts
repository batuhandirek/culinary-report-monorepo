import { Provider } from '@nestjs/common';

import ImageKit from '@imagekit/nodejs';

import { imageConfig } from '../config/image.config.js';

export const imagekitProvider: Provider<ImageKit> = {
	provide: ImageKit,
	inject: [],
	async useFactory() {
		const ik = new ImageKit({
			privateKey: imageConfig.IMAGE_KIT_PRIVATE_KEY!,
		});
		return ik;
	},
};
