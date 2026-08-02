/**
 * Enterprise 2.1 P4 — object storage adapter (local or S3-compatible).
 * Env: DMS_STORAGE=local|s3, DMS_STORAGE_PATH, AWS_* for S3 later.
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export type StoredObject = { storageKey: string; sha256: string };

export function storeDocumentVersion(
  documentId: string,
  version: number,
  bytes: Buffer,
): StoredObject {
  const mode = (process.env.DMS_STORAGE || 'local').toLowerCase();
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const storageKey = `dms/${documentId}/v${version}`;
  if (mode === 's3') {
    // Placeholder: wire AWS SDK in full prod; keep key contract stable
    if (!process.env.DMS_S3_BUCKET) {
      throw new Error('DMS_STORAGE=s3 requires DMS_S3_BUCKET');
    }
    // Fail closed until SDK wired — local still works
    throw new Error('DMS S3 adapter not wired — set DMS_STORAGE=local or implement SDK putObject');
  }
  const root = process.env.DMS_STORAGE_PATH || join(process.cwd(), '.data', 'dms');
  const dir = join(root, documentId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `v${version}`), bytes);
  return { storageKey, sha256 };
}
