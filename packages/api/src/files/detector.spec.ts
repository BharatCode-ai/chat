import * as fs from 'fs';
import * as path from 'path';
import {
  validateMimeAndExtension,
  sniffMimeType,
  isTextBuffer,
  MimeError,
  MimeErrorCode,
} from './detector';

describe('MIME Sniifing and Validation Helpers', () => {
  // Helper to read local test fixtures
  const getFixtureBuffer = (filename: string): Buffer => {
    return fs.readFileSync(path.join(__dirname, 'fixtures', filename));
  };

  // Mock buffers creator helpers mapped to local fixtures
  const createPngBuffer = () => getFixtureBuffer('pixel.png');
  const createJpegBuffer = () => getFixtureBuffer('pixel.jpg');
  const createGifBuffer = (version: '87a' | '89a') => getFixtureBuffer('pixel.gif');
  const createWebpBuffer = () => getFixtureBuffer('pixel.webp');
  const createPdfBuffer = () => getFixtureBuffer('pixel.pdf');
  
  const createZipBuffer = (innerFile?: string) => {
    if (innerFile === 'word/document.xml') {
      return getFixtureBuffer('pixel.docx');
    }
    if (innerFile === 'xl/workbook.xml') {
      return getFixtureBuffer('pixel.xlsx');
    }
    if (innerFile === 'ppt/presentation.xml') {
      return getFixtureBuffer('pixel.pptx');
    }
    return getFixtureBuffer('pixel.zip');
  };

  const createTextBuffer = (text: string) => Buffer.from(text, 'utf8');
  const createBinaryJunkBuffer = () => Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

  describe('isTextBuffer', () => {
    it('should identify printable ASCII text as text', () => {
      const buf = getFixtureBuffer('pixel.txt');
      expect(isTextBuffer(buf)).toBe(true);
    });

    it('should identify empty buffer as non-text', () => {
      expect(isTextBuffer(Buffer.alloc(0))).toBe(false);
    });

    it('should reject binary files with null bytes', () => {
      const buf = createBinaryJunkBuffer();
      expect(isTextBuffer(buf)).toBe(false);
    });

    it('should reject text files with control characters like ESC', () => {
      const buf = Buffer.from('Hello \x1b world');
      expect(isTextBuffer(buf)).toBe(false);
    });

    it('should allow tabs, carriage returns, and newlines', () => {
      const buf = createTextBuffer('Line 1\r\nLine 2\twith tabs');
      expect(isTextBuffer(buf)).toBe(true);
    });
  });

  describe('sniffMimeType', () => {
    it('should detect PNG', () => {
      expect(sniffMimeType(createPngBuffer())).toBe('image/png');
    });

    it('should detect JPEG', () => {
      expect(sniffMimeType(createJpegBuffer())).toBe('image/jpeg');
    });

    it('should detect GIF', () => {
      expect(sniffMimeType(createGifBuffer('87a'))).toBe('image/gif');
      expect(sniffMimeType(createGifBuffer('89a'))).toBe('image/gif');
    });

    it('should detect WebP', () => {
      expect(sniffMimeType(createWebpBuffer())).toBe('image/webp');
    });

    it('should detect PDF', () => {
      expect(sniffMimeType(createPdfBuffer())).toBe('application/pdf');
    });

    it('should detect generic ZIP', () => {
      expect(sniffMimeType(createZipBuffer())).toBe('application/zip');
    });

    it('should detect DOCX from ZIP structure', () => {
      expect(sniffMimeType(createZipBuffer('word/document.xml'))).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('should detect XLSX from ZIP structure', () => {
      expect(sniffMimeType(createZipBuffer('xl/workbook.xml'))).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should detect PPTX from ZIP structure', () => {
      expect(sniffMimeType(createZipBuffer('ppt/presentation.xml'))).toBe(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
    });

    it('should detect SVG', () => {
      const svg = getFixtureBuffer('pixel.svg');
      expect(sniffMimeType(svg)).toBe('image/svg+xml');
    });

    it('should detect HTML', () => {
      const html = getFixtureBuffer('pixel.html');
      expect(sniffMimeType(html)).toBe('text/html');
    });

    it('should default to text/plain for unrecognized printable text', () => {
      expect(sniffMimeType(createTextBuffer('simple plain text'))).toBe('text/plain');
    });

    it('should return null for unknown binary files', () => {
      expect(sniffMimeType(createBinaryJunkBuffer())).toBeNull();
    });
  });

  describe('validateMimeAndExtension', () => {
    it('should accept matching PDF file', () => {
      const resolved = validateMimeAndExtension(createPdfBuffer(), 'report.pdf');
      expect(resolved).toBe('application/pdf');
    });

    it('should accept matching PNG file', () => {
      const resolved = validateMimeAndExtension(createPngBuffer(), 'avatar.PNG');
      expect(resolved).toBe('image/png');
    });

    it('should accept matching DOCX file', () => {
      const resolved = validateMimeAndExtension(createZipBuffer('word/document.xml'), 'document.docx');
      expect(resolved).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should accept CSV files', () => {
      const resolved = validateMimeAndExtension(getFixtureBuffer('pixel.csv'), 'data.csv');
      expect(resolved).toBe('text/csv');
    });

    it('should accept Markdown files', () => {
      const resolved = validateMimeAndExtension(getFixtureBuffer('pixel.md'), 'readme.md');
      expect(resolved).toBe('text/markdown');
    });

    const expectMimeError = (fn: () => any, code: MimeErrorCode, messageSubstr?: string) => {
      let thrown = false;
      try {
        fn();
      } catch (err: any) {
        thrown = true;
        expect(err).toBeInstanceOf(MimeError);
        expect(err.code).toBe(code);
        if (messageSubstr) {
          expect(err.message).toContain(messageSubstr);
        }
      }
      expect(thrown).toBe(true);
    };

    it('should reject spoofed extension (PDF claiming to be PNG)', () => {
      expectMimeError(() => {
        validateMimeAndExtension(createPdfBuffer(), 'spoof.png');
      }, MimeErrorCode.MIME_MISMATCH, 'MIME type mismatch');
    });

    it('should reject spoofed extension (Text claiming to be PDF)', () => {
      expectMimeError(() => {
        validateMimeAndExtension(createTextBuffer('Just some plain text'), 'spoof.pdf');
      }, MimeErrorCode.MIME_MISMATCH, 'MIME type mismatch');
    });

    it('should reject general ZIP claiming to be DOCX', () => {
      expectMimeError(() => {
        validateMimeAndExtension(createZipBuffer(), 'spoof.docx');
      }, MimeErrorCode.MIME_MISMATCH, 'MIME type mismatch');
    });

    it('should reject corrupt/binary CSV file', () => {
      expectMimeError(() => {
        validateMimeAndExtension(createBinaryJunkBuffer(), 'binary.csv');
      }, MimeErrorCode.INVALID_CONTENT, 'Invalid text content');
    });

    it('should reject plain text claiming to be SVG without svg tags', () => {
      expectMimeError(() => {
        validateMimeAndExtension(createTextBuffer('Not an SVG file content'), 'vector.svg');
      }, MimeErrorCode.INVALID_CONTENT, 'Invalid SVG file');
    });

    it('should reject plain text claiming to be HTML without html tags', () => {
      expectMimeError(() => {
        validateMimeAndExtension(createTextBuffer('Plain normal text'), 'page.html');
      }, MimeErrorCode.INVALID_CONTENT, 'Invalid HTML file');
    });

    it('should throw INVALID_BUFFER on empty buffer', () => {
      expectMimeError(() => {
        validateMimeAndExtension(Buffer.alloc(0), 'file.txt');
      }, MimeErrorCode.INVALID_BUFFER, 'File buffer is empty or invalid');
    });

    it('should throw UNSUPPORTED_MIME on unknown extension and unknown content type', () => {
      expectMimeError(() => {
        validateMimeAndExtension(createBinaryJunkBuffer(), 'file.xyz');
      }, MimeErrorCode.UNSUPPORTED_MIME, 'Unsupported or unrecognized file format');
    });

    it('should resolve unknown extension if content matches supported type', () => {
      const resolved = validateMimeAndExtension(createPngBuffer(), 'file.xyz');
      expect(resolved).toBe('image/png');
    });
  });
});

