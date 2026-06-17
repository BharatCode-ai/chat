import { ProcessorError } from '../interfaces/IProcessorRegistry';
import type {
  FileProcessor,
  ProcessorInput,
  ProcessorOutput,
} from '../interfaces/IProcessorRegistry';

/**
 * No-op processor that accepts any of its registered MIME types
 * but produces no derived artifacts.
 *
 * Used as a placeholder for future real processors (PDF, image, Office, etc.)
 * and as a testing stub to verify registry dispatch behaviour.
 *
 * Design decisions:
 *  - Accepts a configurable list of MIME types at construction time.
 *  - process() returns an empty artifacts array and minimal metadata.
 *  - No external binaries, no network calls, no side effects.
 */
export class NoOpProcessor implements FileProcessor {
  readonly name: string;
  readonly supportedMimeTypes: readonly string[];

  constructor(name: string, supportedMimeTypes: string[]) {
    if (!name || name.trim().length === 0) {
      throw new ProcessorError({
        code: 'UNKNOWN',
        message: 'Processor name must not be empty',
      });
    }
    if (!supportedMimeTypes || supportedMimeTypes.length === 0) {
      throw new ProcessorError({
        code: 'UNKNOWN',
        message: 'Processor must support at least one MIME type',
      });
    }
    this.name = name;
    this.supportedMimeTypes = Object.freeze([...supportedMimeTypes]);
  }

  async process(input: ProcessorInput): Promise<ProcessorOutput> {
    if (!this.supportedMimeTypes.includes(input.mimeType)) {
      throw new ProcessorError({
        code: 'UNSUPPORTED_MIME_TYPE',
        message: `Processor "${this.name}" does not support MIME type: ${input.mimeType}`,
        mimeType: input.mimeType,
        processorName: this.name,
        fileId: input.fileId,
      });
    }

    return {
      fileId: input.fileId,
      processorName: this.name,
      mimeType: input.mimeType,
      artifacts: [],
      metadata: {
        processedAt: new Date().toISOString(),
        processorName: this.name,
        inputSize: input.buffer.byteLength,
        noOp: true,
      },
    };
  }
}
