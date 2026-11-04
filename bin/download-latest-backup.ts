#!/usr/bin/env bun
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const BUCKET = 'munchwerk';
const PREFIX = 'data/coolify/backups/databases/root-team-0/munchwerk-db-lcqfks4794d5qril5v7l015a/';
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backups');

const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
	console.error('Missing S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY in env');
	process.exit(1);
}

const s3 = new S3Client({
	endpoint: S3_ENDPOINT,
	region: S3_REGION ?? 'auto',
	credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
});

let latestKey: string | undefined;
let latestDate = new Date(0);
let token: string | undefined;
do {
	const res = await s3.send(
		new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token }),
	);
	for (const obj of res.Contents ?? []) {
		if (!obj.Key || obj.Key.endsWith('/')) continue;
		if (obj.LastModified && obj.LastModified > latestDate) {
			latestDate = obj.LastModified;
			latestKey = obj.Key;
		}
	}
	token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);

if (!latestKey) {
	console.error(`No objects found under s3://${BUCKET}/${PREFIX}`);
	process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, path.basename(latestKey));
console.log(`Downloading ${latestKey} (${latestDate.toISOString()}) -> ${outPath}`);

const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: latestKey }));
if (!obj.Body) throw new Error('Empty response body');

const totalBytes = obj.ContentLength;
const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
let downloadedBytes = 0;
async function* trackProgress(source: AsyncIterable<Uint8Array>) {
	for await (const chunk of source) {
		downloadedBytes += chunk.length;
		const progress = totalBytes
			? `${formatMB(downloadedBytes)} / ${formatMB(totalBytes)} MB (${Math.floor((downloadedBytes / totalBytes) * 100)}%)`
			: `${formatMB(downloadedBytes)} MB`;
		process.stdout.write(`\r${progress}`);
		yield chunk;
	}
}

await pipeline(trackProgress(obj.Body as Readable), createWriteStream(outPath));
process.stdout.write('\n');
console.log('Done');
