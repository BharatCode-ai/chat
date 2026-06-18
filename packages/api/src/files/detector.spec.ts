import {
  validateMimeAndExtension,
  sniffMimeType,
  isTextBuffer,
  MimeError,
  MimeErrorCode,
} from './detector';

describe('MIME Sniifing and Validation Helpers', () => {
  // Valid minimal fixtures
  const createPngBuffer = () => Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
  const createJpegBuffer = () => Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  const createGifBuffer = (version: '87a' | '89a') => Buffer.from(version === '87a' ? 'R0lGODdhAQABAPAAAP8AAAAAACwAAAAAAQABAAACAkQBADs=' : 'R0lGODlhAQABAPAAAP8AAAAAACwAAAAAAQABAAACAkQBADs=', 'base64');
  const createWebpBuffer = () => Buffer.from('UklGRhYAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');
  const createPdfBuffer = () => Buffer.from('JVBERi0xLjQKMSAwIG9iago8PAo+PgplbmRvYmoKdHJhaWxlcgo8PAovUm9vdCAxIDAgUgo+PgolJUVPRgo=', 'base64');
  
  const createZipBuffer = (innerFile?: string) => {
    if (innerFile === 'word/document.xml') {
      return Buffer.from('UEsDBBQAAAAAAOO+0lyGphA2BQAAAAUAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbGhlbGxvUEsDBBQAAAAAAOO+0lyGphA2BQAAAAUAAAARAAAAd29yZC9kb2N1bWVudC54bWxoZWxsb1BLAQIUABQAAAAAAOO+0lyGphA2BQAAAAUAAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQAFAAAAAAA477SXIamEDYFAAAABQAAABEAAAAAAAAAAAAAAIABNgAAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAACAAIAgAAAAGoAAAAAAA==', 'base64');
    }
    if (innerFile === 'xl/workbook.xml') {
      return Buffer.from('UEsDBBQAAAAAAOO+0lyGphA2BQAAAAUAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbGhlbGxvUEsDBBQAAAAAAOO+0lyGphA2BQAAAAUAAAAPAAAAeGwvd29ya2Jvb2sueG1saGVsbG9QSwECFAAUAAAAAADjvtJchqYQNgUAAAAFAAAAEwAAAAAAAAAAAAAAgAEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUABQAAAAAAOO+0lyGphA2BQAAAAUAAAAPAAAAAAAAAAAAAACAATYAAAB4bC93b3JrYm9vay54bWxQSwUGAAAAAAIAAgB+AAAAaAAAAAAA', 'base64');
    }
    if (innerFile === 'ppt/presentation.xml') {
      return Buffer.from('UEsDBBQAAAAAAOO+0lyGphA2BQAAAAUAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbGhlbGxvUEsDBBQAAAAAAOO+0lyGphA2BQAAAAUAAAAUAAAAcHB0L3ByZXNlbnRhdGlvbi54bWxoZWxsb1BLAQIUABQAAAAAAOO+0lyGphA2BQAAAAUAAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQAFAAAAAAA477SXIamEDYFAAAABQAAABQAAAAAAAAAAAAAAIABNgAAAHBwdC9wcmVzZW50YXRpb24ueG1sUEsFBgAAAAACAAIAgwAAAG0AAAAAAA==', 'base64');
    }
    return Buffer.from('UEsDBBQAAAAAAOO+0lyGphA2BQAAAAUAAAAIAAAAdGVzdC50eHRoZWxsb1BLAQIUABQAAAAAAOO+0lyGphA2BQAAAAUAAAAIAAAAAAAAAAAAAACAAQAAAAB0ZXN0LnR4dFBLBQYAAAAAAQABADYAAAArAAAAAAA=', 'base64');
  };

  const createTextBuffer = (text: string) => Buffer.from(text, 'utf8');
  const createBinaryJunkBuffer = () => Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

  describe('isTextBuffer', () => {
    it('should identify printable ASCII text as text', () => {
      expect(isTextBuffer(createTextBuffer('simple plain text'))).toBe(true);
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
    it('should detect PNG', async () => {
      expect(await sniffMimeType(createPngBuffer())).toBe('image/png');
    });

    it('should detect JPEG', async () => {
      expect(await sniffMimeType(createJpegBuffer())).toBe('image/jpeg');
    });

    it('should detect GIF', async () => {
      expect(await sniffMimeType(createGifBuffer('87a'))).toBe('image/gif');
      expect(await sniffMimeType(createGifBuffer('89a'))).toBe('image/gif');
    });

    it('should detect WebP', async () => {
      expect(await sniffMimeType(createWebpBuffer())).toBe('image/webp');
    });

    it('should detect PDF', async () => {
      expect(await sniffMimeType(createPdfBuffer())).toBe('application/pdf');
    });

    it('should detect generic ZIP', async () => {
      expect(await sniffMimeType(createZipBuffer())).toBe('application/zip');
    });

    it('should detect DOCX from ZIP structure', async () => {
      expect(await sniffMimeType(createZipBuffer('word/document.xml'))).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('should detect XLSX from ZIP structure', async () => {
      expect(await sniffMimeType(createZipBuffer('xl/workbook.xml'))).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should detect PPTX from ZIP structure', async () => {
      expect(await sniffMimeType(createZipBuffer('ppt/presentation.xml'))).toBe(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
    });

    it('should detect SVG', async () => {
      const svg = createTextBuffer('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>');
      expect(await sniffMimeType(svg)).toBe('image/svg+xml');
    });

    it('should detect HTML', async () => {
      const html = createTextBuffer('<!DOCTYPE html><html><body></body></html>');
      expect(await sniffMimeType(html)).toBe('text/html');
    });

    it('should default to text/plain for unrecognized printable text', async () => {
      expect(await sniffMimeType(createTextBuffer('simple plain text'))).toBe('text/plain');
    });

    it('should return null for unknown binary files', async () => {
      expect(await sniffMimeType(createBinaryJunkBuffer())).toBeNull();
    });
  });

  describe('validateMimeAndExtension', () => {
    it('should accept matching PDF file', async () => {
      const resolved = await validateMimeAndExtension(createPdfBuffer(), 'report.pdf');
      expect(resolved).toBe('application/pdf');
    });

    it('should accept matching PNG file', async () => {
      const resolved = await validateMimeAndExtension(createPngBuffer(), 'avatar.PNG');
      expect(resolved).toBe('image/png');
    });

    it('should accept matching DOCX file', async () => {
      const resolved = await validateMimeAndExtension(createZipBuffer('word/document.xml'), 'document.docx');
      expect(resolved).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should accept CSV files', async () => {
      const resolved = await validateMimeAndExtension(createTextBuffer('col1,col2\nval1,val2'), 'data.csv');
      expect(resolved).toBe('text/csv');
    });

    it('should accept Markdown files', async () => {
      const resolved = await validateMimeAndExtension(createTextBuffer('# Hello World'), 'readme.md');
      expect(resolved).toBe('text/markdown');
    });

    const expectMimeErrorAsync = async (fn: () => Promise<any>, code: MimeErrorCode, messageSubstr?: string) => {
      let thrown = false;
      try {
        await fn();
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

    it('should reject spoofed extension (PDF claiming to be PNG)', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(createPdfBuffer(), 'spoof.png');
      }, MimeErrorCode.MIME_MISMATCH, 'MIME type mismatch');
    });

    it('should reject spoofed extension (Text claiming to be PDF)', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(createTextBuffer('Just some plain text'), 'spoof.pdf');
      }, MimeErrorCode.MIME_MISMATCH, 'MIME type mismatch');
    });

    it('should reject general ZIP claiming to be DOCX', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(createZipBuffer(), 'spoof.docx');
      }, MimeErrorCode.MIME_MISMATCH, 'MIME type mismatch');
    });

    it('should reject corrupt/binary CSV file', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(createBinaryJunkBuffer(), 'binary.csv');
      }, MimeErrorCode.INVALID_CONTENT, 'Invalid text content');
    });

    it('should reject plain text claiming to be SVG without svg tags', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(createTextBuffer('Not an SVG file content'), 'vector.svg');
      }, MimeErrorCode.INVALID_CONTENT, 'Invalid SVG file');
    });

    it('should reject plain text claiming to be HTML without html tags', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(createTextBuffer('Plain normal text'), 'page.html');
      }, MimeErrorCode.INVALID_CONTENT, 'Invalid HTML file');
    });

    it('should reject active text formats spoofed as inert text', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(createTextBuffer('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'file.txt');
      }, MimeErrorCode.MIME_MISMATCH, 'MIME type mismatch');
    });

    it('should throw INVALID_BUFFER on empty buffer', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(Buffer.alloc(0), 'file.txt');
      }, MimeErrorCode.INVALID_BUFFER, 'File buffer is empty or invalid');
    });

    it('should throw UNSUPPORTED_MIME on unknown extension and unknown content type', async () => {
      await expectMimeErrorAsync(async () => {
        await validateMimeAndExtension(createBinaryJunkBuffer(), 'file.xyz');
      }, MimeErrorCode.UNSUPPORTED_MIME, 'Unsupported or unrecognized file format');
    });

    it('should resolve unknown extension if content matches supported type', async () => {
      const resolved = await validateMimeAndExtension(createPngBuffer(), 'file.xyz');
      expect(resolved).toBe('image/png');
    });
  });
});
