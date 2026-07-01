import { ProcessorError } from '../interfaces/IProcessorRegistry';
import type {
  FileProcessor,
  ProcessorInput,
  ProcessorOutput,
  ProcessorRegistry,
} from '../interfaces/IProcessorRegistry';
import { normalizeMimeType } from '../utils';

/**
 * In-memory implementation of ProcessorRegistry for unit tests and local dev.
 *
 * No external dependencies, no disk I/O, no network calls.
 * All state lives in JS Maps inside the instance.
 *
 * Design decisions:
 *  - Processors are registered by name; MIME types are indexed for O(1) lookup.
 *  - The first processor registered for a MIME type wins (no override).
 *  - unregister removes the processor and cleans up its MIME type index entries.
 *  - Wildcard MIME types (e.g. "text/*") are not supported — exact match only.
 */
export class InMemoryProcessorRegistry implements ProcessorRegistry {
  /** processorName -> FileProcessor */
  private processors = new Map<string, FileProcessor>();

  /** processorName -> normalized mime types (snapshot) */
  private processorMimes = new Map<string, string[]>();

  /** mimeType -> processorName */
  private mimeIndex = new Map<string, string>();

  /** Whether the registry has been initialised */
  private ready = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.ready = true;
  }

  async destroy(): Promise<void> {
    this.processors.clear();
    this.processorMimes.clear();
    this.mimeIndex.clear();
    this.ready = false;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private assertReady(): void {
    if (!this.ready) {
      throw new ProcessorError({
        code: 'REGISTRY_NOT_READY',
        message: 'ProcessorRegistry not initialised',
      });
    }
  }

  // ── Registration ───────────────────────────────────────────────────────

  register(processor: FileProcessor): void {
    if (this.processors.has(processor.name)) {
      throw new ProcessorError({
        code: 'ALREADY_REGISTERED',
        message: `Processor already registered: ${processor.name}`,
        processorName: processor.name,
      });
    }

    const normalizedMimes = processor.supportedMimeTypes.map(normalizeMimeType);

    // Pre-flight check: reject duplicate MIME registrations entirely
    for (const mime of normalizedMimes) {
      if (this.mimeIndex.has(mime)) {
        throw new ProcessorError({
          code: 'ALREADY_REGISTERED',
          message: `MIME type already registered: ${mime}`,
          mimeType: mime,
          processorName: processor.name,
        });
      }
    }

    this.processors.set(processor.name, processor);
    this.processorMimes.set(processor.name, normalizedMimes);

    for (const mime of normalizedMimes) {
      this.mimeIndex.set(mime, processor.name);
    }
  }

  unregister(processorName: string): void {
    const processor = this.processors.get(processorName);
    if (!processor) {
      throw new ProcessorError({
        code: 'PROCESSOR_NOT_FOUND',
        message: `Processor not found: ${processorName}`,
        processorName,
      });
    }

    // Remove MIME type index entries using the snapshot
    const registeredMimes = this.processorMimes.get(processorName) || [];
    for (const mime of registeredMimes) {
      if (this.mimeIndex.get(mime) === processorName) {
        this.mimeIndex.delete(mime);
      }
    }

    this.processorMimes.delete(processorName);
    this.processors.delete(processorName);
  }

  // ── Query ──────────────────────────────────────────────────────────────

  getProcessor(mimeType: string): FileProcessor {
    const normalizedMime = normalizeMimeType(mimeType);
    const processorName = this.mimeIndex.get(normalizedMime);
    if (!processorName) {
      throw new ProcessorError({
        code: 'UNSUPPORTED_MIME_TYPE',
        message: `No processor registered for MIME type: ${mimeType}`,
        mimeType,
      });
    }

    const processor = this.processors.get(processorName);
    if (!processor) {
      throw new ProcessorError({
        code: 'PROCESSOR_NOT_FOUND',
        message: `Processor "${processorName}" was indexed but not found`,
        processorName,
        mimeType,
      });
    }

    return processor;
  }

  getSupportedMimeTypes(): string[] {
    return [...this.mimeIndex.keys()].sort();
  }

  canProcess(mimeType: string): boolean {
    return this.mimeIndex.has(normalizeMimeType(mimeType));
  }

  // ── Dispatch ───────────────────────────────────────────────────────────

  async process(input: ProcessorInput): Promise<ProcessorOutput> {
    this.assertReady();

    const processor = this.getProcessor(input.mimeType);
    return processor.process(input);
  }
}
