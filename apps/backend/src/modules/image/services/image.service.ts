import { RequiredEntityData } from '@mikro-orm/core';

import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';

import ImageKit, { toFile } from '@imagekit/nodejs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import { imageConfig } from 'src/modules/image/config/image.config.js';

import { MediaTypeEnum } from '../constants/media-type.enum.constant.js';
import { Image } from '../entities/image.entity.js';
import { ImageUploadToken } from '../interfaces/image-upload-token.interface.js';
import { ImageRepository } from '../repositories/image.repository.js';

// ImageKit caps V2 upload tokens at one hour; a capture session is well under that per photo.
const IMAGE_UPLOAD_TOKEN_TTL_SECONDS = 15 * 60;
// A proof clip, not a film: enough to show the item switched on and doing its job. ImageKit
// has already stored the file by the time we can look, so a longer or heavier one is deleted.
const VIDEO_MAX_DURATION_SECONDS = 60;
const VIDEO_MAX_FILE_SIZE = 100 * 1024 * 1024;
// Sweep paging. Every run reads from the start, so a folder past PAGE_SIZE × MAX_PAGES files
// (live listing photos count) leaves the files past it unswept — raise the cap before then.
const IMAGE_SWEEP_PAGE_SIZE = 500;
const IMAGE_SWEEP_MAX_PAGES = 20;
// ImageKit's bulk-delete cap.
const IMAGE_BULK_DELETE_SIZE = 100;

/** ImageKit stored the file but can't read it as an image (some ICO files); the upload is deleted. */
export class UnreadableImageError extends Error {}

@Injectable()
export class ImageService {
	private readonly logger = new Logger(ImageService.name);
	constructor(
		private imagekit: ImageKit,
		private imageRepository: ImageRepository,
	) {}

	async createImage(img: string, folder: string, fileName: string): Promise<Image> {
		const uploaded = await this.uploadToImagekit(img, folder, fileName);
		const image = this.imageRepository.create({
			remoteId: uploaded.fileId!,
			width: uploaded.width!,
			height: uploaded.height!,
			aspectRatio: uploaded.width! / uploaded.height!,
			path: uploaded.filePath!,
			fileName: uploaded.name!,
			fileType: uploaded.fileType!,
			fileSize: uploaded.size!,
			url: uploaded.url!,
		});
		return image;
	}

	/**
	 * {@link createImage} for bytes the server fetched itself (a venue's favicon). ImageKit
	 * reads the dimensions; a file it reports none for is not an image it can serve, so it is
	 * deleted again and this throws {@link UnreadableImageError}. Any other error (keys,
	 * outage) is ImageKit's own and propagates as is.
	 */
	async createImageFromBytes(bytes: Buffer, folder: string, fileName: string): Promise<Image> {
		const uploaded = await this.imagekit.files.upload({
			file: await toFile(bytes, fileName),
			folder: this.constructFolderName(folder),
			fileName,
			useUniqueFileName: true,
		});
		if (!uploaded.width || !uploaded.height) {
			if (uploaded.fileId)
				await this.imagekit.files.delete(uploaded.fileId).catch(() => undefined);
			throw new UnreadableImageError(`ImageKit read no dimensions from ${fileName}`);
		}
		return this.imageRepository.create({
			remoteId: uploaded.fileId!,
			width: uploaded.width,
			height: uploaded.height,
			aspectRatio: uploaded.width / uploaded.height,
			path: uploaded.filePath!,
			fileName: uploaded.name!,
			fileType: uploaded.fileType!,
			fileSize: uploaded.size!,
			url: uploaded.url!,
		});
	}

	/**
	 * Removes the row (flushed by the caller) and its ImageKit file, unless another row shares
	 * the file ({@link duplicate}). A failed delete only leaves the file for
	 * {@link deleteUnreferencedFiles}.
	 */
	async removeImage(image: Image): Promise<void> {
		await this.removeImages([image]);
	}

	/**
	 * Removes the rows (flushed by the caller) and each ImageKit file no row outside them
	 * shares. Rows sharing one file go in one call: one at a time, each would see the others
	 * still stored and leave the file behind.
	 */
	async removeImages(images: Image[]): Promise<void> {
		if (!images.length) return;
		const ids = images.map(image => image.id);
		const em = this.imageRepository.getEntityManager();
		for (const image of images) em.remove(image);
		for (const remoteId of new Set(images.map(image => image.remoteId))) {
			const shared = await this.imageRepository.count({ remoteId, id: { $nin: ids } });
			if (shared > 0) continue;
			await this.imagekit.files.delete(remoteId).catch((e: Error) => {
				this.logger.warn(`ImageKit file ${remoteId} delete failed: ${e.message}`);
			});
		}
	}

	/**
	 * Uploads a base64 / data-URL image and returns only the hosted URL — no `Image` entity.
	 * For content that references images by URL (e.g. inline blog images embedded in markdown)
	 * rather than by a foreign key, so we don't create orphan `Image` rows.
	 */
	async uploadImageUrl(img: string, folder: string, fileName: string): Promise<string> {
		const uploaded = await this.uploadToImagekit(img, folder, fileName);
		return uploaded.url!;
	}

	/**
	 * Signed tokens for uploading straight from the client to ImageKit, so photos never pass
	 * through our request bodies. These are ImageKit **V2** upload JWTs: V2 verifies the whole
	 * upload payload against the token, so the folder is fixed here and the client cannot
	 * redirect the upload elsewhere. The client must send `fileName` and `folder` exactly as
	 * returned, next to the file and the token. Each token is single-use; the random file
	 * name also keeps tokens signed in the same second from being byte-identical (a repeated
	 * JWT counts as used).
	 */
	createUploadTokens(folder: string, count: number, extension = 'jpg'): ImageUploadToken[] {
		const constructedFolderName = this.constructFolderName(folder);
		const expiresInSeconds = IMAGE_UPLOAD_TOKEN_TTL_SECONDS;
		const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
		return Array.from({ length: count }, () => {
			const fileName = `${randomUUID()}.${extension}`;
			const token = jwt.sign(
				{ fileName, folder: constructedFolderName },
				imageConfig.IMAGE_KIT_PRIVATE_KEY,
				{
					algorithm: 'HS256',
					expiresIn: expiresInSeconds,
					header: { alg: 'HS256', typ: 'JWT', kid: imageConfig.IMAGE_KIT_PUBLIC_KEY },
				},
			);
			return { token, fileName, folder: constructedFolderName, expiresAt };
		});
	}

	/**
	 * Builds an {@link Image} (unflushed) for a file the client uploaded with a token from
	 * {@link createUploadTokens}. Everything is read back from ImageKit by `fileId` — the
	 * client never supplies a URL or dimensions — and the file must sit in `folder`, so a
	 * caller cannot attach an arbitrary URL or another user's upload. A non-image is deleted
	 * from ImageKit and rejected.
	 */
	async createImageFromRemote(fileId: string, folder: string): Promise<Image> {
		return this.imageRepository.create(await this.readRemoteImage(fileId, folder));
	}

	/**
	 * What {@link createImageFromRemote} checks and reads, without creating the row: for a
	 * caller that creates it in its own transaction, after this network call.
	 */
	async readRemoteImage(fileId: string, folder: string): Promise<RequiredEntityData<Image>> {
		return this.readRemoteFile(fileId, folder, false);
	}

	/**
	 * {@link createImageFromRemote} for a slot that also takes a short video (a listing's proof
	 * of working). The row comes back with `mediaType` VIDEO and its `duration`; a clip over the
	 * length or size cap is deleted and rejected like a non-image is.
	 */
	async createMediaFromRemote(fileId: string, folder: string): Promise<Image> {
		return this.imageRepository.create(await this.readRemoteFile(fileId, folder, true));
	}

	private async readRemoteFile(
		fileId: string,
		folder: string,
		allowVideo: boolean,
	): Promise<RequiredEntityData<Image>> {
		let file: Awaited<ReturnType<ImageKit['files']['get']>>;
		try {
			file = await this.imagekit.files.get(fileId);
		} catch (e) {
			this.logger.warn(`ImageKit file ${fileId} lookup failed: ${(e as Error).message}`);
			throw new BadRequestException('Unknown file');
		}

		const expectedPrefix = `/${this.constructFolderName(folder)}/`;
		if (!file.filePath?.startsWith(expectedPrefix)) {
			throw new ForbiddenException('File is not in the expected folder');
		}
		const isVideo = allowVideo && !!file.mime?.startsWith('video/');
		const reject = async (message: string): Promise<never> => {
			await this.imagekit.files.delete(fileId).catch(() => undefined);
			throw new BadRequestException(message);
		};
		if (!file.width || !file.height) return reject('File is not an image');
		if (isVideo) {
			if (!file.duration || file.duration > VIDEO_MAX_DURATION_SECONDS) {
				return reject(`Video must be at most ${VIDEO_MAX_DURATION_SECONDS} seconds`);
			}
			if ((file.size ?? Infinity) > VIDEO_MAX_FILE_SIZE) return reject('Video is too large');
		} else if (!file.mime?.startsWith('image/')) {
			return reject('File is not an image');
		}

		return {
			remoteId: file.fileId!,
			width: file.width,
			height: file.height,
			aspectRatio: file.width / file.height,
			path: file.filePath,
			fileName: file.name!,
			fileType: file.fileType!,
			fileSize: file.size!,
			url: file.url!,
			mediaType: isVideo ? MediaTypeEnum.VIDEO : MediaTypeEnum.IMAGE,
			duration: isVideo ? file.duration : undefined,
		};
	}

	/**
	 * Deletes files under `folder` (and its subfolders) that were created before
	 * `createdBefore` and that no `Image` row points to. The age floor protects uploads
	 * still on their way to being registered.
	 *
	 * Reference, not folder, is the only safe test: a published listing duplicates its draft's
	 * `Image` row but keeps the same file, so live listing photos sit in draft folders too.
	 * Lists everything first and deletes after, so deleting never shifts the pages being read.
	 */
	async deleteUnreferencedFiles(folder: string, createdBefore: Date): Promise<number> {
		const prefix = `/${this.constructFolderName(folder)}/`;
		// ImageKit takes `YYYY-MM-DDTHH:MM:SS`, read as UTC.
		const before = createdBefore.toISOString().slice(0, 19);
		const candidates: string[] = [];
		for (let page = 0; page < IMAGE_SWEEP_MAX_PAGES; page++) {
			const assets = await this.imagekit.assets.list({
				searchQuery: `path: "${prefix}" AND createdAt < "${before}"`,
				limit: IMAGE_SWEEP_PAGE_SIZE,
				skip: page * IMAGE_SWEEP_PAGE_SIZE,
			});
			for (const asset of assets) {
				// Re-checked here: a query that matched too broadly must still delete nothing
				// outside the folder or younger than the floor.
				if (asset.type !== 'file' || !asset.fileId) continue;
				if (!asset.filePath?.startsWith(prefix)) continue;
				if (!asset.createdAt || new Date(asset.createdAt) >= createdBefore) continue;
				candidates.push(asset.fileId);
			}
			if (assets.length < IMAGE_SWEEP_PAGE_SIZE) break;
		}

		let deleted = 0;
		for (let i = 0; i < candidates.length; i += IMAGE_BULK_DELETE_SIZE) {
			const batch = candidates.slice(i, i + IMAGE_BULK_DELETE_SIZE);
			const referenced = new Set(
				(
					await this.imageRepository.find(
						{ remoteId: { $in: batch } },
						{ fields: ['remoteId'] },
					)
				).map(img => img.remoteId),
			);
			const orphans = batch.filter(id => !referenced.has(id));
			if (orphans.length === 0) continue;
			await this.imagekit.files.bulk.delete({ fileIds: orphans });
			deleted += orphans.length;
		}
		return deleted;
	}

	private constructFolderName(folder: string) {
		if (folder.length === 0) {
			throw new Error(`Folder name needs to exist, submitted "${folder}"`);
		}
		return `${imageConfig.IMAGE_KIT_FOLDER_PREFIX}-${folder}`;
	}

	private async uploadToImagekit(img: string, folder: string, fileName: string) {
		return this.imagekit.files.upload({
			file: img,
			folder: this.constructFolderName(folder),
			fileName,
			useUniqueFileName: true,
		});
	}

	duplicate(image: Image): Image {
		return this.imageRepository.create({
			remoteId: image.remoteId,
			width: image.width,
			height: image.height,
			aspectRatio: image.aspectRatio,
			path: image.path,
			url: image.url,
			fileName: image.fileName,
			fileType: image.fileType,
			fileSize: image.fileSize,
			mediaType: image.mediaType,
			duration: image.duration,
		});
	}
}
