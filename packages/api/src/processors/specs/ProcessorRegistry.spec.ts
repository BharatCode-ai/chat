import { InMemoryProcessorRegistry } from '../implementations/InMemoryProcessorRegistry';
import { NoOpProcessor } from '../implementations/NoOpProcessor';
import type { ProcessorInput } from '../interfaces/IProcessorRegistry';

/** Helper to build a minimal ProcessorInput */
function makeInput(overrides?: Partial<ProcessorInput>): ProcessorInput {
  return {
    fileId: 'file-1',
    objectName: 'document.pdf',
    userId: 'user-1',
    mimeType: 'application/pdf',
    buffer: Buffer.from('fake file content'),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NoOpProcessor
// ═══════════════════════════════════════════════════════════════════════════════

describe('NoOpProcessor', () => {
  it('should store its name and supported MIME types', () => {
    const proc = new NoOpProcessor('pdf-noop', ['application/pdf']);
    expect(proc.name).toBe('pdf-noop');
    expect(proc.supportedMimeTypes).toEqual(['application/pdf']);
  });

  it('should freeze its supportedMimeTypes array', () => {
    const proc = new NoOpProcessor('text-noop', ['text/plain', 'text/csv']);
    expect(Object.isFrozen(proc.supportedMimeTypes)).toBe(true);
  });

  it('should throw when name is empty', () => {
    expect(() => new NoOpProcessor('', ['text/plain'])).toThrow('UNKNOWN');
  });

  it('should throw when name is only whitespace', () => {
    expect(() => new NoOpProcessor('   ', ['text/plain'])).toThrow('UNKNOWN');
  });

  it('should throw when supportedMimeTypes is empty', () => {
    expect(() => new NoOpProcessor('empty', [])).toThrow('UNKNOWN');
  });

  it('should process a supported MIME type and return no-op output', async () => {
    const proc = new NoOpProcessor('pdf-noop', ['application/pdf']);
    const input = makeInput();

    const output = await proc.process(input);

    expect(output).toMatchObject({
      fileId: 'file-1',
      processorName: 'pdf-noop',
      mimeType: 'application/pdf',
      artifacts: [],
    });
    expect(output.metadata).toMatchObject({
      processorName: 'pdf-noop',
      inputSize: input.buffer.byteLength,
      noOp: true,
    });
    expect(output.metadata.processedAt).toBeTruthy();
  });

  it('should throw UNSUPPORTED_MIME_TYPE for a MIME type it does not handle', async () => {
    const proc = new NoOpProcessor('pdf-noop', ['application/pdf']);
    const input = makeInput({ mimeType: 'image/png' });

    await expect(proc.process(input)).rejects.toThrow('UNSUPPORTED_MIME_TYPE');
  });

  it('should support multiple MIME types', async () => {
    const proc = new NoOpProcessor('text-noop', ['text/plain', 'text/csv', 'text/markdown']);

    for (const mime of ['text/plain', 'text/csv', 'text/markdown']) {
      const output = await proc.process(makeInput({ mimeType: mime }));
      expect(output.processorName).toBe('text-noop');
      expect(output.mimeType).toBe(mime);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// InMemoryProcessorRegistry
// ═══════════════════════════════════════════════════════════════════════════════

describe('InMemoryProcessorRegistry', () => {
  let registry: InMemoryProcessorRegistry;

  beforeEach(() => {
    registry = new InMemoryProcessorRegistry();
  });

  afterEach(async () => {
    await registry.destroy();
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────

  describe('initialize / destroy', () => {
    it('should become ready after initialize()', async () => {
      await registry.initialize();
      registry.register(new NoOpProcessor('test', ['text/plain']));
      const output = await registry.process(makeInput({ mimeType: 'text/plain' }));
      expect(output).toBeDefined();
    });

    it('should throw REGISTRY_NOT_READY when processing before initialize()', async () => {
      registry.register(new NoOpProcessor('test', ['text/plain']));
      const promise = registry.process(makeInput({ mimeType: 'text/plain' }));
      await expect(promise).rejects.toThrow('REGISTRY_NOT_READY');
    });

    it('should clear state after destroy()', async () => {
      await registry.initialize();
      registry.register(new NoOpProcessor('test', ['text/plain']));
      await registry.destroy();

      // After destroy, process should throw not-ready
      const promise = registry.process(makeInput({ mimeType: 'text/plain' }));
      await expect(promise).rejects.toThrow('REGISTRY_NOT_READY');
    });

    it('should clear processors after destroy()', async () => {
      registry.register(new NoOpProcessor('test', ['text/plain']));
      await registry.destroy();

      expect(registry.getSupportedMimeTypes()).toHaveLength(0);
    });
  });

  // ── Registration ───────────────────────────────────────────────────────

  describe('register', () => {
    it('should register a processor successfully', () => {
      const proc = new NoOpProcessor('pdf-noop', ['application/pdf']);
      registry.register(proc);

      expect(registry.canProcess('application/pdf')).toBe(true);
    });

    it('should throw ALREADY_REGISTERED for duplicate processor names', () => {
      registry.register(new NoOpProcessor('pdf-noop', ['application/pdf']));

      expect(() => {
        registry.register(new NoOpProcessor('pdf-noop', ['application/pdf']));
      }).toThrow('ALREADY_REGISTERED');
    });

    it('should reject different processors with overlapping MIME types', () => {
      registry.register(new NoOpProcessor('proc-a', ['text/plain']));
      expect(() => {
        registry.register(new NoOpProcessor('proc-b', ['text/plain', 'text/csv']));
      }).toThrow('ALREADY_REGISTERED');
    });

    it('should normalize MIME types consistently', () => {
      registry.register(new NoOpProcessor('normalizer-proc', ['TEXT/PLAIN; charset=utf-8']));
      expect(registry.canProcess('text/plain')).toBe(true);
      expect(registry.getProcessor(' Text/Plain ; boundary=something ').name).toBe('normalizer-proc');
    });

    it('should ignore mutations to supportedMimeTypes after registration (snapshot behavior)', () => {
      // Create a custom processor because NoOpProcessor freezes its array
      const customProc = {
        name: 'mutator-proc',
        supportedMimeTypes: ['image/jpeg'],
        process: async (input: any) => ({ fileId: input.fileId, processorName: 'mutator-proc', mimeType: 'image/jpeg', artifacts: [], metadata: { processedAt: new Date(), inputSize: 0 }})
      };
      registry.register(customProc);

      // Mutate the array after registration
      customProc.supportedMimeTypes.push('image/gif');

      // The registry should NOT pick up the mutated array
      expect(registry.canProcess('image/gif')).toBe(false);

      // Unregister should properly clean up the original snapshot, ignoring the mutation
      registry.unregister('mutator-proc');
      expect(registry.canProcess('image/jpeg')).toBe(false);
    });

    it('should index all MIME types from a multi-type processor', () => {
      registry.register(new NoOpProcessor('multi', ['image/png', 'image/jpeg', 'image/gif']));

      expect(registry.canProcess('image/png')).toBe(true);
      expect(registry.canProcess('image/jpeg')).toBe(true);
      expect(registry.canProcess('image/gif')).toBe(true);
    });
  });

  // ── Unregister ─────────────────────────────────────────────────────────

  describe('unregister', () => {
    it('should remove a registered processor', () => {
      registry.register(new NoOpProcessor('pdf-noop', ['application/pdf']));
      registry.unregister('pdf-noop');

      expect(registry.canProcess('application/pdf')).toBe(false);
    });

    it('should throw PROCESSOR_NOT_FOUND for unregistered name', () => {
      expect(() => registry.unregister('ghost')).toThrow('PROCESSOR_NOT_FOUND');
    });

    it('should not affect other processors when unregistering one', () => {
      registry.register(new NoOpProcessor('text-proc', ['text/plain']));
      registry.register(new NoOpProcessor('pdf-proc', ['application/pdf']));

      registry.unregister('pdf-proc');

      expect(registry.canProcess('text/plain')).toBe(true);
      expect(registry.canProcess('application/pdf')).toBe(false);
    });

    it('should only remove MIME index entries belonging to the unregistered processor', () => {
      registry.register(new NoOpProcessor('proc-a', ['text/plain']));
      registry.register(new NoOpProcessor('proc-b', ['text/csv']));

      registry.unregister('proc-a');

      expect(registry.canProcess('text/plain')).toBe(false);
      expect(registry.canProcess('text/csv')).toBe(true);
    });

    it('should allow re-registering after unregister', () => {
      registry.register(new NoOpProcessor('reuse', ['text/html']));
      registry.unregister('reuse');
      registry.register(new NoOpProcessor('reuse', ['text/html']));

      expect(registry.canProcess('text/html')).toBe(true);
    });
  });

  // ── Query ──────────────────────────────────────────────────────────────

  describe('getProcessor', () => {
    it('should return the correct processor for a registered MIME type', () => {
      registry.register(new NoOpProcessor('pdf-noop', ['application/pdf']));
      const proc = registry.getProcessor('application/pdf');
      expect(proc.name).toBe('pdf-noop');
    });

    it('should throw UNSUPPORTED_MIME_TYPE for an unregistered MIME type', () => {
      expect(() => registry.getProcessor('video/mp4')).toThrow('UNSUPPORTED_MIME_TYPE');
    });
  });

  describe('getSupportedMimeTypes', () => {
    it('should return an empty list when no processors are registered', () => {
      expect(registry.getSupportedMimeTypes()).toEqual([]);
    });

    it('should return sorted MIME types from all registered processors', () => {
      registry.register(new NoOpProcessor('text-proc', ['text/plain', 'text/csv']));
      registry.register(new NoOpProcessor('pdf-proc', ['application/pdf']));

      const mimes = registry.getSupportedMimeTypes();
      expect(mimes).toEqual(['application/pdf', 'text/csv', 'text/plain']);
    });
  });

  describe('canProcess', () => {
    it('should return true for a registered MIME type', () => {
      registry.register(new NoOpProcessor('test', ['text/plain']));
      expect(registry.canProcess('text/plain')).toBe(true);
    });

    it('should return false for an unregistered MIME type', () => {
      expect(registry.canProcess('application/octet-stream')).toBe(false);
    });
  });

  // ── Dispatch ───────────────────────────────────────────────────────────

  describe('process', () => {
    it('should dispatch to the correct processor by MIME type', async () => {
      await registry.initialize();
      registry.register(new NoOpProcessor('text-proc', ['text/plain']));
      registry.register(new NoOpProcessor('pdf-proc', ['application/pdf']));

      const textResult = await registry.process(makeInput({ mimeType: 'text/plain' }));
      expect(textResult.processorName).toBe('text-proc');

      const pdfResult = await registry.process(makeInput({ mimeType: 'application/pdf' }));
      expect(pdfResult.processorName).toBe('pdf-proc');
    });

    it('should throw UNSUPPORTED_MIME_TYPE for an unregistered MIME type', async () => {
      await registry.initialize();
      const promise = registry.process(makeInput({ mimeType: 'video/mp4' }));
      await expect(promise).rejects.toThrow('UNSUPPORTED_MIME_TYPE');
    });

    it('should include correct fileId in the output', async () => {
      await registry.initialize();
      registry.register(new NoOpProcessor('test', ['text/plain']));

      const result = await registry.process(
        makeInput({ fileId: 'custom-file-id', mimeType: 'text/plain' }),
      );
      expect(result.fileId).toBe('custom-file-id');
    });

    it('should pass the full input to the processor', async () => {
      await registry.initialize();
      registry.register(new NoOpProcessor('test', ['text/plain']));

      const buf = Buffer.from('test content with known length');
      const result = await registry.process(makeInput({ mimeType: 'text/plain', buffer: buf }));
      expect(result.metadata.inputSize).toBe(buf.byteLength);
    });
  });

  // ── Integration ────────────────────────────────────────────────────────

  describe('integration', () => {
    it('should support a full register-dispatch-unregister lifecycle', async () => {
      await registry.initialize();

      // Register
      registry.register(new NoOpProcessor('doc-proc', ['application/pdf', 'text/plain']));
      expect(registry.canProcess('application/pdf')).toBe(true);
      expect(registry.canProcess('text/plain')).toBe(true);

      // Dispatch
      const result = await registry.process(makeInput({ mimeType: 'application/pdf' }));
      expect(result.processorName).toBe('doc-proc');
      expect(result.artifacts).toEqual([]);

      // Unregister
      registry.unregister('doc-proc');
      expect(registry.canProcess('application/pdf')).toBe(false);

      // Dispatch fails after unregister
      const promise = registry.process(makeInput({ mimeType: 'application/pdf' }));
      await expect(promise).rejects.toThrow('UNSUPPORTED_MIME_TYPE');
    });

    it('should handle many processors with distinct MIME types', async () => {
      await registry.initialize();

      const mimeGroups = [
        { name: 'text', mimes: ['text/plain', 'text/csv', 'text/markdown'] },
        { name: 'image', mimes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] },
        { name: 'pdf', mimes: ['application/pdf'] },
        { name: 'office', mimes: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]},
      ];

      for (const group of mimeGroups) {
        registry.register(new NoOpProcessor(group.name, group.mimes));
      }

      const supported = registry.getSupportedMimeTypes();
      expect(supported).toHaveLength(11);

      // Dispatch to each group
      for (const group of mimeGroups) {
        const result = await registry.process(makeInput({ mimeType: group.mimes[0] }));
        expect(result.processorName).toBe(group.name);
      }

      // Unsupported still fails
      const promise = registry.process(makeInput({ mimeType: 'video/mp4' }));
      await expect(promise).rejects.toThrow('UNSUPPORTED_MIME_TYPE');
    });

    it('should produce deterministic errors with structured codes', async () => {
      await registry.initialize();

      try {
        registry.getProcessor('unknown/type');
        fail('should have thrown');
      } catch (err: unknown) {
        const e = err as { code: string; mimeType: string; name: string };
        expect(e.name).toBe('ProcessorError');
        expect(e.code).toBe('UNSUPPORTED_MIME_TYPE');
        expect(e.mimeType).toBe('unknown/type');
      }
    });
  });
});
