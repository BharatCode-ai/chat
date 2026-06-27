import { randomUUID } from 'node:crypto';
import {
  ArtifactFileError,
  ArtifactFileErrorCode,
  assertValidStorageObjectName,
} from 'librechat-data-provider';

export function createArtifactId(prefix: 'file' | 'filever'): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

export function validateStorageInput(input: {
  userId: string;
  objectName?: string;
  bytes?: Uint8Array;
}) {
  if (!input.userId.trim()) {
    throw new ArtifactFileError(ArtifactFileErrorCode.INVALID_INPUT, 'userId is required');
  }

  if (input.objectName != null) {
    assertValidStorageObjectName(input.objectName);
  }

  if (input.bytes != null && input.bytes.byteLength === 0) {
    throw new ArtifactFileError(ArtifactFileErrorCode.INVALID_INPUT, 'bytes are required');
  }
}

export function storageNotFound(details: Record<string, unknown>): ArtifactFileError {
  return new ArtifactFileError(
    ArtifactFileErrorCode.STORAGE_NOT_FOUND,
    'Storage object was not found',
    details,
  );
}

export function safePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%/g, '_');
}
