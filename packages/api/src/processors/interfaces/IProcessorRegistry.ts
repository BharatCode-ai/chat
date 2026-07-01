/**
 * RFC 0001: File and Artifact Platform
 * ProcessorRegistry interface and related types.
 *
 * The ProcessorRegistry dispatches extraction and preview jobs by MIME type.
 * Implementations route supported MIME types to named processor capabilities.
 *
 * Processors are no-op stubs in the first contributor slice; real PDF parsing,
 * OCR, embeddings, and Office conversion are out of scope.
 */

// ─── Error Types ─────────────────────────────────────────────────────────────

/**
 * Stable error codes for ProcessorRegistry operations.
 * Consumers can switch on these codes without parsing messages.
 */
export type ProcessorErrorCode =
  | 'UNSUPPORTED_MIME_TYPE'
  | 'PROCESSOR_NOT_FOUND'
  | 'PROCESSING_FAILED'
  | 'ALREADY_REGISTERED'
  | 'REGISTRY_NOT_READY'
  | 'UNKNOWN';

export interface ProcessorErrorOptions {
  code: ProcessorErrorCode;
  message: string;
  mimeType?: string;
  processorName?: string;
  fileId?: string;
}

/**
 * Structured error thrown by ProcessorRegistry operations.
 * Designed to be serialised into API error responses.
 */
export class ProcessorError extends Error {
  code: ProcessorErrorCode;
  mimeType?: string;
  processorName?: string;
  fileId?: string;

  constructor({ code, message, mimeType, processorName, fileId }: ProcessorErrorOptions) {
    super(`${code}: ${message}`);
    this.name = 'ProcessorError';
    this.code = code;
    this.mimeType = mimeType;
    this.processorName = processorName;
    this.fileId = fileId;
  }
}

// ─── Input / Output Types ────────────────────────────────────────────────────

/**
 * Kind of derived asset produced by a processor.
 */
export type DerivedAssetKind =
  | 'thumbnail'
  | 'preview'
  | 'extracted_text'
  | 'ocr'
  | 'embedding'
  | 'transcript'
  | 'metadata';

/**
 * A single derived artifact produced by processing.
 */
export interface ProcessedArtifact {
  /** Human-readable name of the derived artifact */
  name: string;
  /** MIME type of the derived artifact */
  mimeType: string;
  /** Raw bytes of the derived artifact */
  buffer: Buffer;
  /** Classification of this derived artifact */
  kind: DerivedAssetKind;
}

/**
 * Input supplied to a processor's process() method.
 */
export interface ProcessorInput {
  fileId: string;
  objectName: string;
  userId: string;
  mimeType: string;
  buffer: Buffer;
}

/**
 * Result returned by a processor after processing a file.
 */
export interface ProcessorOutput {
  /** The fileId that was processed */
  fileId: string;
  /** Name of the processor that handled the file */
  processorName: string;
  /** Original MIME type of the input file */
  mimeType: string;
  /** Derived artifacts produced during processing */
  artifacts: ProcessedArtifact[];
  /** Arbitrary metadata extracted during processing */
  metadata: Record<string, unknown>;
}

// ─── Processor Interface ─────────────────────────────────────────────────────

/**
 * A single file processor that handles one or more MIME types.
 *
 * Implementations:
 *  - NoOpProcessor       (contributor / testing stub)
 *  - Future: PdfProcessor, ImageProcessor, OfficeProcessor, etc.
 */
export interface FileProcessor {
  /** Unique name identifying this processor */
  readonly name: string;

  /** MIME types this processor can handle */
  readonly supportedMimeTypes: readonly string[];

  /**
   * Process a file and return derived artifacts + metadata.
   *
   * @throws ProcessorError with code 'PROCESSING_FAILED' on failure.
   */
  process(input: ProcessorInput): Promise<ProcessorOutput>;
}

// ─── Registry Interface ──────────────────────────────────────────────────────

/**
 * Registry that routes MIME types to FileProcessor implementations (RFC 0001).
 *
 * Every method is async where appropriate so that in-memory and future
 * distributed implementations share the same call signature.
 *
 * Implementations:
 *  - InMemoryProcessorRegistry (unit tests / local dev)
 */
export interface ProcessorRegistry {
  // ── Lifecycle ──────────────────────────────────────────────────────────

  /**
   * Initialise the registry. Called once before any dispatch operation.
   */
  initialize(): Promise<void>;

  /**
   * Tear down the registry and release resources.
   */
  destroy(): Promise<void>;

  // ── Registration ───────────────────────────────────────────────────────

  /**
   * Register a processor. Its supportedMimeTypes are indexed for dispatch.
   *
   * @throws ProcessorError with code 'ALREADY_REGISTERED' if a processor
   *         with the same name is already registered.
   */
  register(processor: FileProcessor): void;

  /**
   * Remove a previously registered processor by name.
   *
   * @throws ProcessorError with code 'PROCESSOR_NOT_FOUND' if no processor
   *         with the given name exists.
   */
  unregister(processorName: string): void;

  // ── Query ──────────────────────────────────────────────────────────────

  /**
   * Look up the processor registered for a given MIME type.
   *
   * @throws ProcessorError with code 'UNSUPPORTED_MIME_TYPE' when no
   *         processor handles the given MIME type.
   */
  getProcessor(mimeType: string): FileProcessor;

  /**
   * Return all MIME types that have a registered processor.
   */
  getSupportedMimeTypes(): string[];

  /**
   * Check whether a MIME type has a registered processor.
   */
  canProcess(mimeType: string): boolean;

  // ── Dispatch ───────────────────────────────────────────────────────────

  /**
   * Route a file to the appropriate processor by MIME type and process it.
   *
   * @throws ProcessorError with code 'UNSUPPORTED_MIME_TYPE' when no
   *         processor handles the input's MIME type.
   * @throws ProcessorError with code 'REGISTRY_NOT_READY' when called
   *         before initialize().
   */
  process(input: ProcessorInput): Promise<ProcessorOutput>;
}
