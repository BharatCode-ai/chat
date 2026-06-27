import {
  ArtifactFileErrorCode,
  InMemoryProcessorRegistry,
  artifactRecordSchema,
  detectArtifactMimeType,
  fileRecordSchema,
  parseBharatCodeFileReference,
} from './file-artifacts';

const bytes = (value: string | number[]) =>
  typeof value === 'string' ? new Uint8Array(Buffer.from(value, 'utf8')) : new Uint8Array(value);

describe('RFC 0001 file and artifact contract', () => {
  describe('detectArtifactMimeType', () => {
    it('accepts a structurally valid PPTX-style OOXML upload', () => {
      expect(
        detectArtifactMimeType({
          filename: 'quarterly-plan.pptx',
          bytes: bytes([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
        }),
      ).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    });

    it('rejects an Office extension when the bytes are not a ZIP container', () => {
      expect(() =>
        detectArtifactMimeType({
          filename: 'quarterly-plan.pptx',
          bytes: bytes('this is not a pptx'),
        }),
      ).toThrow(expect.objectContaining({ code: ArtifactFileErrorCode.MIME_MISMATCH }));
    });

    it('rejects active HTML uploaded as inert text', () => {
      expect(() =>
        detectArtifactMimeType({
          filename: 'notes.txt',
          bytes: bytes('<html><body>not plain notes</body></html>'),
        }),
      ).toThrow(expect.objectContaining({ code: ArtifactFileErrorCode.MIME_MISMATCH }));
    });

    it('detects Markdown as a supported durable artifact type', () => {
      expect(
        detectArtifactMimeType({
          filename: 'summary.md',
          bytes: bytes('# Summary\n\n- Durable artifacts\n'),
        }),
      ).toBe('text/markdown');
    });

    it('rejects known binary content uploaded as Markdown', () => {
      expect(() =>
        detectArtifactMimeType({
          filename: 'summary.md',
          bytes: bytes('%PDF-1.7\n%%EOF'),
        }),
      ).toThrow(expect.objectContaining({ code: ArtifactFileErrorCode.MIME_MISMATCH }));
    });
  });

  describe('parseBharatCodeFileReference', () => {
    it('normalizes valid structured file references from tools', () => {
      expect(
        parseBharatCodeFileReference({
          type: 'bharatcode_file',
          file_id: 'file_abc123',
          artifact_id: 'artifact_deck123',
          name: 'quarterly-plan.pptx',
          content_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          download_url: '/api/chat/files/file_abc123/download',
        }),
      ).toEqual({
        type: 'bharatcode_file',
        fileId: 'file_abc123',
        artifactId: 'artifact_deck123',
        name: 'quarterly-plan.pptx',
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        downloadUrl: '/api/chat/files/file_abc123/download',
      });
    });

    it('rejects raw cloud storage URLs in model-facing tool responses', () => {
      expect(() =>
        parseBharatCodeFileReference({
          type: 'bharatcode_file',
          file_id: 'file_abc123',
          name: 'quarterly-plan.pptx',
          content_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          download_url: 'https://storage.googleapis.com/bharatcode-chat-artifacts/raw.pptx',
        }),
      ).toThrow(expect.objectContaining({ code: ArtifactFileErrorCode.UNSAFE_DOWNLOAD_URL }));
    });
  });

  describe('metadata schemas', () => {
    it('defaults file records to private visibility', () => {
      const record = fileRecordSchema.parse({
        id: 'file_abc123',
        ownerUserId: 'user_123',
        name: 'analysis.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeBytes: 4096,
        currentVersionId: 'filever_abc123',
      });

      expect(record.visibility).toBe('private');
      expect(record.lifecycle).toBe('active');
    });

    it('models a versioned generated artifact without storage-provider details', () => {
      const artifact = artifactRecordSchema.parse({
        id: 'artifact_abc123',
        ownerUserId: 'user_123',
        kind: 'presentation',
        name: 'Quarterly Plan',
        currentVersionId: 'artifactver_abc123',
        sourceFileIds: ['file_abc123'],
      });

      expect(artifact.visibility).toBe('private');
      expect(artifact.sourceFileIds).toEqual(['file_abc123']);
      expect(JSON.stringify(artifact)).not.toContain('storage.googleapis.com');
    });
  });

  describe('InMemoryProcessorRegistry', () => {
    it('dispatches by normalized content type and blocks duplicate registrations', async () => {
      const registry = new InMemoryProcessorRegistry();
      const processor = {
        name: 'pdf.parse',
        supportedContentTypes: ['application/pdf'],
        process: jest.fn(async () => ({
          status: 'ok' as const,
          text: 'parsed pdf',
          derivedAssets: [],
        })),
      };

      registry.register(processor);

      expect(registry.canProcess('APPLICATION/PDF')).toBe(true);
      await expect(
        registry.process({
          fileId: 'file_pdf123',
          versionId: 'filever_pdf123',
          name: 'paper.pdf',
          contentType: 'application/pdf',
          bytes: bytes('%PDF-1.7\n%%EOF'),
        }),
      ).resolves.toEqual({
        status: 'ok',
        text: 'parsed pdf',
        derivedAssets: [],
      });

      expect(() =>
        registry.register({
          ...processor,
          name: 'pdf.parse.again',
        }),
      ).toThrow(expect.objectContaining({ code: ArtifactFileErrorCode.PROCESSOR_CONFLICT }));
    });
  });
});
