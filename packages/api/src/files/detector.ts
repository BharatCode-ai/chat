import * as path from 'path';
import yauzl from 'yauzl';

export enum MimeErrorCode {
  INVALID_BUFFER = 'INVALID_BUFFER',
  MIME_MISMATCH = 'MIME_MISMATCH',
  INVALID_CONTENT = 'INVALID_CONTENT',
  UNSUPPORTED_MIME = 'UNSUPPORTED_MIME',
}

export class MimeError extends Error {
  public code: MimeErrorCode;

  constructor(message: string, code: MimeErrorCode) {
    super(message);
    this.name = 'MimeError';
    this.code = code;
    Object.setPrototypeOf(this, MimeError.prototype);
  }
}

// Maps extension to canonical MIME type
export const extensionToMime: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  md: 'text/markdown',
  markdown: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  zip: 'application/zip',
};

// Supported MIME types list
export const supportedMimeTypes = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/markdown',
  'text/html',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
]);

/**
 * Checks if the buffer contains valid text/printable content.
 * Validates UTF-8 explicitly and disallows null bytes and most control characters.
 */
export function isTextBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return false;
  }
  const limit = Math.min(buffer.length, 64000); // Check a larger chunk
  const sample = buffer.subarray(0, limit);
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    if (byte === 0) {
      return false; // Null byte indicates binary content
    }
    // Allow horizontal tab (9), line feed (10), carriage return (13).
    // Disallow other control characters below 32 (like ESC, DEL, etc.)
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      return false;
    }
  }

  // Validate UTF-8 encoding strictly
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(sample);
  } catch (err) {
    return false;
  }

  return true;
}

/**
 * Reads entries from a ZIP buffer.
 */
function readZipEntries(buffer: Buffer): Promise<Set<string>> {
  return new Promise((resolve) => {
    const entries = new Set<string>();
    yauzl.fromBuffer(buffer, { lazyEntries: false }, (err, zipfile) => {
      if (err || !zipfile) {
        return resolve(entries);
      }
      zipfile.on('entry', (entry) => {
        entries.add(entry.fileName);
      });
      zipfile.on('end', () => {
        resolve(entries);
      });
      zipfile.on('error', () => {
        resolve(entries);
      });
    });
  });
}

/**
 * Sniffs the magic bytes / header of the buffer to identify the MIME type.
 * Returns null if the format is not recognized.
 */
export async function sniffMimeType(buffer: Buffer): Promise<string | null> {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  // 1. PNG check: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // 2. JPEG check: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // 3. GIF check: GIF87a or GIF89a (47 49 46 38 37/39 61)
  if (buffer.length >= 6) {
    const gifHeader = buffer.toString('ascii', 0, 6);
    if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
      return 'image/gif';
    }
  }

  // 4. WebP check: RIFF at 0-3, WEBP at 8-11
  if (buffer.length >= 12) {
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    if (riff === 'RIFF' && webp === 'WEBP') {
      return 'image/webp';
    }
  }

  // 5. PDF check: %PDF- (25 50 44 46 2D)
  if (buffer.length >= 5) {
    const pdfHeader = buffer.toString('ascii', 0, 5);
    if (pdfHeader.startsWith('%PDF-')) {
      return 'application/pdf';
    }
  }

  // 6. ZIP / OOXML check: PK\x03\x04 (50 4B 03 04)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4B &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    const entries = await readZipEntries(buffer);
    if (entries.has('[Content_Types].xml') || entries.has('_rels/.rels')) {
      if (entries.has('word/document.xml') || entries.has('word/_rels/document.xml.rels')) {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      if (entries.has('xl/workbook.xml') || entries.has('xl/_rels/workbook.xml.rels')) {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
      if (entries.has('ppt/presentation.xml') || entries.has('ppt/_rels/presentation.xml.rels')) {
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      }
    }
    return 'application/zip';
  }

  // 7. Text-based format heuristics
  if (isTextBuffer(buffer)) {
    const textSample = buffer.toString('utf8', 0, Math.min(buffer.length, 8000)).trim();

    // SVG check
    if (textSample.includes('<svg') || textSample.includes('xmlns="http://www.w3.org/2000/svg"')) {
      return 'image/svg+xml';
    }

    // HTML check (case-insensitive check for common HTML structure tags)
    const htmlRegex = /<!DOCTYPE\s+html|<html|<body|<head|<script/i;
    if (htmlRegex.test(textSample)) {
      return 'text/html';
    }

    // Default fallback for text buffers
    return 'text/plain';
  }

  return null;
}

/**
 * Validates a file buffer and filename to detect spoofing, verify content format, and check support.
 * @param buffer The file content buffer
 * @param filename The name of the file (to extract extension)
 * @throws MimeError on validation failure
 * @returns The resolved verified MIME type
 */
export async function validateMimeAndExtension(buffer: Buffer, filename: string): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new MimeError('File buffer is empty or invalid', MimeErrorCode.INVALID_BUFFER);
  }

  if (!filename) {
    throw new MimeError('Filename must be provided', MimeErrorCode.INVALID_BUFFER);
  }

  const ext = path.extname(filename).slice(1).toLowerCase();
  const expectedMime = extensionToMime[ext];

  // 1. Identify format by content sniffing
  const sniffedMime = await sniffMimeType(buffer);

  // 2. Perform validations based on expected type (if extension is known)
  if (expectedMime) {
    const isExpectedBinary = !expectedMime.startsWith('text/') && expectedMime !== 'image/svg+xml';
    
    if (sniffedMime) {
      const isSniffedBinary = !sniffedMime.startsWith('text/') && sniffedMime !== 'image/svg+xml';

      if (isSniffedBinary && sniffedMime !== expectedMime) {
        throw new MimeError(
          `MIME type mismatch: expected ${expectedMime} (based on extension), but sniffed ${sniffedMime}`,
          MimeErrorCode.MIME_MISMATCH
        );
      }

      if (sniffedMime === 'text/plain') {
        if (isExpectedBinary) {
          throw new MimeError(
            `MIME type mismatch: extension suggests binary format ${expectedMime}, but file contains plain text`,
            MimeErrorCode.MIME_MISMATCH
          );
        }
      }

      // Check if active text formats are mislabeled as inert text
      if ((expectedMime === 'text/plain' || expectedMime === 'text/csv' || expectedMime === 'text/markdown') && 
          (sniffedMime === 'text/html' || sniffedMime === 'image/svg+xml')) {
        throw new MimeError(
          `MIME type mismatch: expected inert text format ${expectedMime}, but detected active format ${sniffedMime}`,
          MimeErrorCode.MIME_MISMATCH
        );
      }

      // Special content validations
      if (expectedMime === 'image/svg+xml' && sniffedMime !== 'image/svg+xml') {
        throw new MimeError(
          'Invalid SVG file: content does not match SVG schema',
          MimeErrorCode.INVALID_CONTENT
        );
      }

      if (expectedMime === 'text/html' && sniffedMime !== 'text/html') {
        throw new MimeError(
          'Invalid HTML file: missing HTML tags',
          MimeErrorCode.INVALID_CONTENT
        );
      }
    } else {
      // Sniffed MIME is null
      if (isExpectedBinary) {
        throw new MimeError(
          `Invalid content: file does not match the signature of ${expectedMime}`,
          MimeErrorCode.INVALID_CONTENT
        );
      } else {
        throw new MimeError(
          `Invalid text content: file with extension .${ext} contains binary/invalid characters`,
          MimeErrorCode.INVALID_CONTENT
        );
      }
    }

    // Check if the resolved mime type is supported
    if (!supportedMimeTypes.has(expectedMime)) {
      throw new MimeError(
        `Unsupported file type: ${expectedMime}`,
        MimeErrorCode.UNSUPPORTED_MIME
      );
    }

    return expectedMime;
  }

  // 3. Extension is unknown/empty
  if (sniffedMime) {
    if (!supportedMimeTypes.has(sniffedMime)) {
      throw new MimeError(
        `Unsupported sniffed MIME type: ${sniffedMime}`,
        MimeErrorCode.UNSUPPORTED_MIME
      );
    }
    return sniffedMime;
  }

  throw new MimeError(
    'Unsupported or unrecognized file format',
    MimeErrorCode.UNSUPPORTED_MIME
  );
}
