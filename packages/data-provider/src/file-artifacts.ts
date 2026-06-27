import { z } from 'zod';

export enum ArtifactFileErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_OBJECT_NAME = 'INVALID_OBJECT_NAME',
  INVALID_FILE_REFERENCE = 'INVALID_FILE_REFERENCE',
  INVALID_CONTENT = 'INVALID_CONTENT',
  MIME_MISMATCH = 'MIME_MISMATCH',
  UNSUPPORTED_MIME_TYPE = 'UNSUPPORTED_MIME_TYPE',
  UNSAFE_DOWNLOAD_URL = 'UNSAFE_DOWNLOAD_URL',
  PROCESSOR_CONFLICT = 'PROCESSOR_CONFLICT',
  PROCESSOR_NOT_FOUND = 'PROCESSOR_NOT_FOUND',
  STORAGE_NOT_READY = 'STORAGE_NOT_READY',
  STORAGE_NOT_FOUND = 'STORAGE_NOT_FOUND',
}

export class ArtifactFileError extends Error {
  code: ArtifactFileErrorCode;
  details?: Record<string, unknown>;

  constructor(code: ArtifactFileErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ArtifactFileError';
    this.code = code;
    this.details = details;
  }
}

export const ArtifactContentTypes = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  markdown: 'text/markdown',
  html: 'text/html',
  text: 'text/plain',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
} as const;

export type SupportedArtifactContentType =
  (typeof ArtifactContentTypes)[keyof typeof ArtifactContentTypes];

const supportedContentTypes = new Set<string>(Object.values(ArtifactContentTypes));

const extensionToContentType: Record<string, SupportedArtifactContentType> = {
  pdf: ArtifactContentTypes.pdf,
  docx: ArtifactContentTypes.docx,
  pptx: ArtifactContentTypes.pptx,
  xlsx: ArtifactContentTypes.xlsx,
  csv: ArtifactContentTypes.csv,
  md: ArtifactContentTypes.markdown,
  markdown: ArtifactContentTypes.markdown,
  html: ArtifactContentTypes.html,
  htm: ArtifactContentTypes.html,
  txt: ArtifactContentTypes.text,
  png: ArtifactContentTypes.png,
  jpg: ArtifactContentTypes.jpeg,
  jpeg: ArtifactContentTypes.jpeg,
  webp: ArtifactContentTypes.webp,
};

const fileIdPattern = /^file_[A-Za-z0-9_-]+$/;
const fileVersionIdPattern = /^filever_[A-Za-z0-9_-]+$/;
const artifactIdPattern = /^artifact_[A-Za-z0-9_-]+$/;
const artifactVersionIdPattern = /^artifactver_[A-Za-z0-9_-]+$/;

export const artifactContentTypeSchema = z
  .string()
  .transform((value) => normalizeContentType(value))
  .refine((value) => supportedContentTypes.has(value), 'Unsupported artifact content type');

export const fileRecordSchema = z.object({
  id: z.string().regex(fileIdPattern),
  ownerUserId: z.string().min(1),
  name: z.string().min(1),
  contentType: artifactContentTypeSchema,
  sizeBytes: z.number().int().nonnegative(),
  currentVersionId: z.string().regex(fileVersionIdPattern),
  visibility: z.enum(['private', 'project', 'public']).default('private'),
  lifecycle: z.enum(['active', 'deleted']).default('active'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const fileVersionRecordSchema = z.object({
  id: z.string().regex(fileVersionIdPattern),
  fileId: z.string().regex(fileIdPattern),
  ownerUserId: z.string().min(1),
  objectName: z.string().min(1),
  contentType: artifactContentTypeSchema,
  sizeBytes: z.number().int().nonnegative(),
  storageKey: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const artifactRecordSchema = z.object({
  id: z.string().regex(artifactIdPattern),
  ownerUserId: z.string().min(1),
  kind: z.enum([
    'markdown',
    'html',
    'document',
    'presentation',
    'spreadsheet',
    'pdf',
    'csv',
    'site',
  ]),
  name: z.string().min(1),
  currentVersionId: z.string().regex(artifactVersionIdPattern),
  sourceFileIds: z.array(z.string().regex(fileIdPattern)).default([]),
  visibility: z.enum(['private', 'project', 'public']).default('private'),
  lifecycle: z.enum(['active', 'deleted']).default('active'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const artifactVersionRecordSchema = z.object({
  id: z.string().regex(artifactVersionIdPattern),
  artifactId: z.string().regex(artifactIdPattern),
  ownerUserId: z.string().min(1),
  fileId: z.string().regex(fileIdPattern),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type FileRecord = z.infer<typeof fileRecordSchema>;
export type FileVersionRecord = z.infer<typeof fileVersionRecordSchema>;
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;
export type ArtifactVersionRecord = z.infer<typeof artifactVersionRecordSchema>;

export type StorageObjectHandle = {
  fileId: string;
  versionId: string;
  userId: string;
  objectName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
};

export type StorageWriteInput = {
  userId: string;
  fileId?: string;
  objectName: string;
  contentType: string;
  bytes: Uint8Array;
};

export type StorageReadInput = {
  userId: string;
  fileId: string;
  versionId?: string;
};

export type StorageReadResult = {
  handle: StorageObjectHandle;
  bytes: Uint8Array;
};

export type StorageCopyInput = {
  userId: string;
  source: StorageObjectHandle | StorageReadInput;
  objectName: string;
  targetFileId?: string;
};

export interface StorageDriver {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  write(input: StorageWriteInput): Promise<StorageObjectHandle>;
  read(input: StorageReadInput): Promise<StorageReadResult>;
  stat(input: StorageReadInput): Promise<StorageObjectHandle>;
  delete(input: StorageReadInput): Promise<void>;
  copy(input: StorageCopyInput): Promise<StorageObjectHandle>;
}

export type ProcessorInput = {
  fileId: string;
  versionId: string;
  name: string;
  contentType: string;
  bytes: Uint8Array;
};

export type ProcessorOutput = {
  status: 'ok' | 'skipped';
  text?: string;
  derivedAssets: Array<{
    kind: 'preview' | 'thumbnail' | 'ocr' | 'embedding' | 'transcript';
    contentType: string;
    bytes?: Uint8Array;
    text?: string;
  }>;
};

export interface FileProcessor {
  name: string;
  supportedContentTypes: string[];
  process(input: ProcessorInput): Promise<ProcessorOutput>;
}

export class InMemoryProcessorRegistry {
  private processors = new Map<string, FileProcessor>();
  private contentTypeIndex = new Map<string, string>();

  register(processor: FileProcessor): void {
    if (this.processors.has(processor.name)) {
      throw new ArtifactFileError(
        ArtifactFileErrorCode.PROCESSOR_CONFLICT,
        `Processor already registered: ${processor.name}`,
      );
    }

    const normalizedContentTypes = processor.supportedContentTypes.map((contentType) =>
      normalizeContentType(contentType),
    );

    for (const contentType of normalizedContentTypes) {
      if (this.contentTypeIndex.has(contentType)) {
        throw new ArtifactFileError(
          ArtifactFileErrorCode.PROCESSOR_CONFLICT,
          `Processor already registered for content type: ${contentType}`,
          { contentType },
        );
      }
    }

    this.processors.set(processor.name, processor);
    for (const contentType of normalizedContentTypes) {
      this.contentTypeIndex.set(contentType, processor.name);
    }
  }

  canProcess(contentType: string): boolean {
    return this.contentTypeIndex.has(normalizeContentType(contentType));
  }

  getSupportedContentTypes(): string[] {
    return Array.from(this.contentTypeIndex.keys()).sort();
  }

  async process(input: ProcessorInput): Promise<ProcessorOutput> {
    const contentType = normalizeContentType(input.contentType);
    const processorName = this.contentTypeIndex.get(contentType);
    if (!processorName) {
      throw new ArtifactFileError(
        ArtifactFileErrorCode.PROCESSOR_NOT_FOUND,
        `No processor registered for content type: ${contentType}`,
        { contentType },
      );
    }

    const processor = this.processors.get(processorName);
    if (!processor) {
      throw new ArtifactFileError(
        ArtifactFileErrorCode.PROCESSOR_NOT_FOUND,
        `Processor missing from registry: ${processorName}`,
        { processorName },
      );
    }

    return processor.process({ ...input, contentType });
  }
}

export type BharatCodeFileReference = {
  type: 'bharatcode_file';
  fileId: string;
  artifactId?: string;
  name: string;
  contentType: string;
  downloadUrl: string;
};

export function normalizeContentType(contentType: string): string {
  return contentType.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function isSupportedArtifactContentType(contentType: string): boolean {
  return supportedContentTypes.has(normalizeContentType(contentType));
}

export function detectArtifactMimeType(input: {
  filename: string;
  bytes: Uint8Array;
  declaredContentType?: string;
}): SupportedArtifactContentType {
  const filename = input.filename?.trim();
  if (!filename) {
    throw new ArtifactFileError(ArtifactFileErrorCode.INVALID_INPUT, 'Filename is required');
  }

  if (!input.bytes || input.bytes.byteLength === 0) {
    throw new ArtifactFileError(ArtifactFileErrorCode.INVALID_INPUT, 'File bytes are required');
  }

  const expected = extensionToContentType[getExtension(filename)];
  const sniffed = sniffContentType(input.bytes);
  const declared = input.declaredContentType
    ? normalizeContentType(input.declaredContentType)
    : undefined;

  if (declared && !supportedContentTypes.has(declared)) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.UNSUPPORTED_MIME_TYPE,
      `Unsupported declared content type: ${declared}`,
      { declaredContentType: declared },
    );
  }

  if (!expected) {
    if (sniffed && supportedContentTypes.has(sniffed)) {
      return sniffed as SupportedArtifactContentType;
    }
    throw new ArtifactFileError(
      ArtifactFileErrorCode.UNSUPPORTED_MIME_TYPE,
      `Unsupported file extension for ${filename}`,
    );
  }

  assertExpectedContentMatchesBytes(expected, sniffed, input.bytes, filename);

  if (declared && declared !== expected) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.MIME_MISMATCH,
      `Declared content type ${declared} does not match ${expected}`,
      { declaredContentType: declared, expectedContentType: expected },
    );
  }

  return expected;
}

export function parseBharatCodeFileReference(input: unknown): BharatCodeFileReference {
  if (input == null || typeof input !== 'object') {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.INVALID_FILE_REFERENCE,
      'File reference must be an object',
    );
  }

  const value = input as Record<string, unknown>;
  const type = value.type;
  const fileId = value.file_id;
  const artifactId = value.artifact_id;
  const name = value.name;
  const contentType = value.content_type;
  const downloadUrl = value.download_url;

  if (type !== 'bharatcode_file') {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.INVALID_FILE_REFERENCE,
      'File reference type must be bharatcode_file',
    );
  }
  if (typeof fileId !== 'string' || !fileIdPattern.test(fileId)) {
    throw new ArtifactFileError(ArtifactFileErrorCode.INVALID_FILE_REFERENCE, 'Invalid file_id');
  }
  if (
    artifactId != null &&
    (typeof artifactId !== 'string' || !artifactIdPattern.test(artifactId))
  ) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.INVALID_FILE_REFERENCE,
      'Invalid artifact_id',
    );
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ArtifactFileError(ArtifactFileErrorCode.INVALID_FILE_REFERENCE, 'Invalid name');
  }
  if (typeof contentType !== 'string' || !isSupportedArtifactContentType(contentType)) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.UNSUPPORTED_MIME_TYPE,
      'Invalid content_type',
      { contentType },
    );
  }
  if (typeof downloadUrl !== 'string' || !isSafeDownloadUrl(downloadUrl, fileId)) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.UNSAFE_DOWNLOAD_URL,
      'download_url must be an app-relative BharatCode download URL',
      { downloadUrl },
    );
  }

  return {
    type: 'bharatcode_file',
    fileId,
    artifactId: artifactId as string | undefined,
    name,
    contentType: normalizeContentType(contentType),
    downloadUrl,
  };
}

export function assertValidStorageObjectName(objectName: string): string {
  const trimmed = objectName.trim();
  if (
    trimmed.length === 0 ||
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    /^[a-zA-Z]:/.test(trimmed)
  ) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.INVALID_OBJECT_NAME,
      `Unsafe storage object name: ${objectName}`,
      { objectName },
    );
  }

  return trimmed;
}

function isSafeDownloadUrl(downloadUrl: string, fileId: string): boolean {
  if (downloadUrl.includes('://') || downloadUrl.startsWith('//')) {
    return false;
  }

  return downloadUrl === `/api/chat/files/${fileId}/download`;
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot < 0 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

function assertExpectedContentMatchesBytes(
  expected: SupportedArtifactContentType,
  sniffed: string | null,
  bytes: Uint8Array,
  filename: string,
) {
  if (isOfficeContentType(expected)) {
    if (!isZipLike(bytes)) {
      throw new ArtifactFileError(
        ArtifactFileErrorCode.MIME_MISMATCH,
        `${filename} has an Office extension but is not an OOXML ZIP container`,
        { expectedContentType: expected, sniffedContentType: sniffed },
      );
    }
    return;
  }

  if (expected === ArtifactContentTypes.pdf && sniffed !== ArtifactContentTypes.pdf) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.MIME_MISMATCH,
      `${filename} has a PDF extension but does not look like a PDF`,
      { expectedContentType: expected, sniffedContentType: sniffed },
    );
  }

  if (
    isInertTextContentType(expected) &&
    sniffed != null &&
    sniffed !== ArtifactContentTypes.text
  ) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.MIME_MISMATCH,
      `${filename} content does not match its inert text extension`,
      { expectedContentType: expected, sniffedContentType: sniffed },
    );
  }

  if (isTextContentType(expected) && !isTextBytes(bytes)) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.INVALID_CONTENT,
      `${filename} is not valid text content`,
      { expectedContentType: expected },
    );
  }

  if (isImageContentType(expected) && sniffed !== expected) {
    throw new ArtifactFileError(
      ArtifactFileErrorCode.MIME_MISMATCH,
      `${filename} image bytes do not match its extension`,
      { expectedContentType: expected, sniffedContentType: sniffed },
    );
  }
}

function sniffContentType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) && includesAscii(bytes, '%%EOF')) {
    return ArtifactContentTypes.pdf;
  }

  if (isZipLike(bytes)) {
    return 'application/zip';
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return ArtifactContentTypes.png;
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return ArtifactContentTypes.jpeg;
  }

  if (bytes.byteLength >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return ArtifactContentTypes.webp;
  }

  if (!isTextBytes(bytes)) {
    return null;
  }

  const sample = decodeUtf8(bytes).trim();
  if (/<!doctype\s+html|<html[\s>]|<body[\s>]|<head[\s>]|<script[\s>]/i.test(sample)) {
    return ArtifactContentTypes.html;
  }

  return ArtifactContentTypes.text;
}

function isTextContentType(contentType: string): boolean {
  return contentType.startsWith('text/');
}

function isInertTextContentType(contentType: string): boolean {
  return (
    contentType === ArtifactContentTypes.text ||
    contentType === ArtifactContentTypes.csv ||
    contentType === ArtifactContentTypes.markdown
  );
}

function isImageContentType(contentType: string): boolean {
  return contentType.startsWith('image/');
}

function isOfficeContentType(contentType: string): boolean {
  return (
    contentType === ArtifactContentTypes.docx ||
    contentType === ArtifactContentTypes.pptx ||
    contentType === ArtifactContentTypes.xlsx
  );
}

function isZipLike(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.byteLength < prefix.length) {
    return false;
  }

  return prefix.every((byte, index) => bytes[index] === byte);
}

function includesAscii(bytes: Uint8Array, value: string): boolean {
  return decodeLatin1(bytes).includes(value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return decodeLatin1(bytes.slice(start, end));
}

function isTextBytes(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength, 65536);
  for (let index = 0; index < limit; index++) {
    const byte = bytes[index];
    if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
      return false;
    }
  }

  try {
    decodeUtf8(bytes);
    return true;
  } catch {
    return false;
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function decodeLatin1(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
}
