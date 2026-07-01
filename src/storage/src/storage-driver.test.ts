import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorageDriver } from "../src/in-memory-driver.js";
import type { StorageDriver } from "../src/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Test utilities
// ─────────────────────────────────────────────────────────────────────────────

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

/** Deterministic clock for timestamps. */
function makeClock(timestamps: string[]): () => string {
  let i = 0;
  return () => timestamps[i++ % timestamps.length]!;
}

const T1 = "2024-01-01T00:00:00.000Z";
const T2 = "2024-01-01T00:01:00.000Z";
const T3 = "2024-01-01T00:02:00.000Z";

// ─────────────────────────────────────────────────────────────────────────────
// Shared driver instance (reset before each test)
// ─────────────────────────────────────────────────────────────────────────────

let driver: InMemoryStorageDriver;

beforeEach(() => {
  driver = new InMemoryStorageDriver({ clock: () => T1 });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Write
// ─────────────────────────────────────────────────────────────────────────────

describe("write", () => {
  it("creates a new object and returns correct metadata", async () => {
    const result = await driver.write("docs/readme.md", enc("hello"), {
      mimeType: "text/markdown",
      customMetadata: { author: "alice" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.key).toBe("docs/readme.md");
    expect(result.value.sizeBytes).toBe(5);
    expect(result.value.mimeType).toBe("text/markdown");
    expect(result.value.version).toBe("1");
    expect(result.value.createdAt).toBe(T1);
    expect(result.value.updatedAt).toBe(T1);
    expect(result.value.customMetadata).toEqual({ author: "alice" });
  });

  it("increments version and preserves createdAt on overwrite", async () => {
    const d = new InMemoryStorageDriver({ clock: makeClock([T1, T2]) });
    await d.write("file.txt", enc("v1"));
    const result = await d.write("file.txt", enc("v2"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.version).toBe("2");
    expect(result.value.createdAt).toBe(T1); // creation time unchanged
    expect(result.value.updatedAt).toBe(T2); // update time advances
  });

  it("defaults mimeType to application/octet-stream", async () => {
    const result = await driver.write("blob", enc("data"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mimeType).toBe("application/octet-stream");
  });

  it("fails with ALREADY_EXISTS when ifVersionMatch='NEW' and object exists", async () => {
    await driver.write("dup.txt", enc("first"));
    const result = await driver.write("dup.txt", enc("second"), {
      ifVersionMatch: "NEW",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ALREADY_EXISTS");
  });

  it("succeeds with ifVersionMatch='NEW' when object is absent", async () => {
    const result = await driver.write("fresh.txt", enc("new"), {
      ifVersionMatch: "NEW",
    });
    expect(result.ok).toBe(true);
  });

  it("succeeds when ifVersionMatch matches stored version", async () => {
    await driver.write("versioned.txt", enc("v1"));
    const result = await driver.write("versioned.txt", enc("v2"), {
      ifVersionMatch: "1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBe("2");
  });

  it("fails with VERSION_CONFLICT when ifVersionMatch doesn't match", async () => {
    await driver.write("versioned.txt", enc("v1"));
    const result = await driver.write("versioned.txt", enc("v2"), {
      ifVersionMatch: "99",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VERSION_CONFLICT");
  });

  it("fails with VERSION_CONFLICT when object doesn't exist but version given", async () => {
    const result = await driver.write("ghost.txt", enc("x"), {
      ifVersionMatch: "1",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
  });

  it("fails with INVALID_KEY for empty key", async () => {
    const result = await driver.write("", enc("data"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_KEY");
  });

  it("fails with INVALID_KEY for path-traversal key", async () => {
    const result = await driver.write("../../etc/passwd", enc("bad"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_KEY");
  });

  it("fails with INVALID_KEY for key with forbidden characters", async () => {
    const result = await driver.write("key with spaces!", enc("data"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_KEY");
  });

  it("fails with SIZE_EXCEEDED when payload is too large", async () => {
    const small = new InMemoryStorageDriver({ maxSizeBytes: 4 });
    const result = await small.write("big.bin", enc("hello")); // 5 bytes
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("SIZE_EXCEEDED");
  });

  it("fails with INVALID_MIME when MIME type is not allowed", async () => {
    const strict = new InMemoryStorageDriver({
      allowedMimeTypes: ["text/plain"],
    });
    const result = await strict.write("img.png", enc("data"), {
      mimeType: "image/png",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_MIME");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Read
// ─────────────────────────────────────────────────────────────────────────────

describe("read", () => {
  it("returns stored bytes", async () => {
    await driver.write("hello.txt", enc("world"));
    const result = await driver.read("hello.txt");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(dec(result.value)).toBe("world");
  });

  it("returns a copy — mutations don't affect the store", async () => {
    await driver.write("file.txt", enc("original"));
    const r1 = await driver.read("file.txt");
    if (!r1.ok) throw new Error("read failed");

    r1.value[0] = 0xff; // mutate the returned buffer

    const r2 = await driver.read("file.txt");
    if (!r2.ok) throw new Error("read failed");
    expect(dec(r2.value)).toBe("original");
  });

  it("fails with NOT_FOUND for missing key", async () => {
    const result = await driver.read("missing.txt");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
  });

  it("fails with INVALID_KEY for bad key", async () => {
    const result = await driver.read("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_KEY");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Metadata (stat + list)
// ─────────────────────────────────────────────────────────────────────────────

describe("stat", () => {
  it("returns metadata without payload", async () => {
    await driver.write("notes.txt", enc("hello world"), {
      mimeType: "text/plain",
      customMetadata: { tag: "test" },
    });
    const result = await driver.stat("notes.txt");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sizeBytes).toBe(11);
    expect(result.value.mimeType).toBe("text/plain");
    expect(result.value.customMetadata).toEqual({ tag: "test" });
  });

  it("returns a snapshot — mutations don't affect the store", async () => {
    await driver.write("f.txt", enc("hi"), { customMetadata: { x: "1" } });
    const r = await driver.stat("f.txt");
    if (!r.ok) throw new Error("stat failed");

    // @ts-expect-error — intentional mutation attempt on readonly record
    r.value.customMetadata["x"] = "mutated";

    const r2 = await driver.stat("f.txt");
    if (!r2.ok) throw new Error("stat failed");
    expect(r2.value.customMetadata["x"]).toBe("1");
  });

  it("fails with NOT_FOUND for missing key", async () => {
    const result = await driver.stat("nope.txt");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("list", () => {
  beforeEach(async () => {
    await driver.write("images/a.png", enc("a"), { mimeType: "image/png" });
    await driver.write("images/b.png", enc("bb"), { mimeType: "image/png" });
    await driver.write("docs/readme.md", enc("ccc"), { mimeType: "text/markdown" });
  });

  it("lists all objects when no prefix is given", async () => {
    const result = await driver.list();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((m) => m.key).sort()).toEqual([
      "docs/readme.md",
      "images/a.png",
      "images/b.png",
    ]);
  });

  it("filters by prefix", async () => {
    const result = await driver.list("images/");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((m) => m.key)).toEqual([
      "images/a.png",
      "images/b.png",
    ]);
  });

  it("returns empty array when prefix has no matches", async () => {
    const result = await driver.list("videos/");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it("results are sorted by key", async () => {
    const result = await driver.list();
    if (!result.ok) return;
    const keys = result.value.map((m) => m.key);
    expect(keys).toEqual([...keys].sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Delete
// ─────────────────────────────────────────────────────────────────────────────

describe("delete", () => {
  it("removes the object so subsequent reads fail", async () => {
    await driver.write("bye.txt", enc("temporary"));
    const del = await driver.delete("bye.txt");
    expect(del.ok).toBe(true);

    const read = await driver.read("bye.txt");
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.error.code).toBe("NOT_FOUND");
  });

  it("decrements the store size", async () => {
    await driver.write("a.txt", enc("a"));
    await driver.write("b.txt", enc("b"));
    expect(driver.size).toBe(2);

    await driver.delete("a.txt");
    expect(driver.size).toBe(1);
  });

  it("fails with NOT_FOUND for missing key", async () => {
    const result = await driver.delete("ghost.txt");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
  });

  it("fails with INVALID_KEY for bad key", async () => {
    const result = await driver.delete("../escape");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_KEY");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Copy
// ─────────────────────────────────────────────────────────────────────────────

describe("copy", () => {
  beforeEach(async () => {
    await driver.write("original.txt", enc("source content"), {
      mimeType: "text/plain",
      customMetadata: { origin: "true" },
    });
  });

  it("copies payload and metadata to destination", async () => {
    const result = await driver.copy("original.txt", "copy.txt");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.key).toBe("copy.txt");
    expect(result.value.mimeType).toBe("text/plain");

    const read = await driver.read("copy.txt");
    if (!read.ok) throw new Error("read failed");
    expect(dec(read.value)).toBe("source content");
  });

  it("inherits source custom metadata by default", async () => {
    const result = await driver.copy("original.txt", "copy.txt");
    if (!result.ok) throw new Error("copy failed");
    expect(result.value.customMetadata).toEqual({ origin: "true" });
  });

  it("overrides MIME type when specified", async () => {
    const result = await driver.copy("original.txt", "copy.bin", {
      mimeType: "application/octet-stream",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mimeType).toBe("application/octet-stream");
  });

  it("replaces custom metadata when specified", async () => {
    const result = await driver.copy("original.txt", "copy.txt", {
      customMetadata: { newKey: "newVal" },
    });
    if (!result.ok) throw new Error("copy failed");
    expect(result.value.customMetadata).toEqual({ newKey: "newVal" });
  });

  it("increments destination version on overwrite", async () => {
    await driver.copy("original.txt", "copy.txt");   // version 1
    const result = await driver.copy("original.txt", "copy.txt"); // version 2
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBe("2");
  });

  it("fails with ALREADY_EXISTS when failIfExists=true and destination exists", async () => {
    await driver.copy("original.txt", "copy.txt");
    const result = await driver.copy("original.txt", "copy.txt", {
      failIfExists: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ALREADY_EXISTS");
  });

  it("fails with COPY_SRC_MISSING when source doesn't exist", async () => {
    const result = await driver.copy("ghost.txt", "dest.txt");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("COPY_SRC_MISSING");
  });

  it("fails with INVALID_KEY for bad source key", async () => {
    const result = await driver.copy("../bad", "dest.txt");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_KEY");
  });

  it("fails with INVALID_KEY for bad destination key", async () => {
    const result = await driver.copy("original.txt", "bad key!");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_KEY");
  });

  it("source object is not mutated after copy", async () => {
    await driver.copy("original.txt", "copy.txt");
    const src = await driver.read("original.txt");
    if (!src.ok) throw new Error("read failed");
    expect(dec(src.value)).toBe("source content");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Snapshot (versioning)
// ─────────────────────────────────────────────────────────────────────────────

describe("snapshot", () => {
  it("creates a separate snapshot object", async () => {
    await driver.write("doc.txt", enc("v1 content"), {
      mimeType: "text/plain",
    });
    const result = await driver.snapshot("doc.txt", "doc.txt.v1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.key).toBe("doc.txt.v1");

    const read = await driver.read("doc.txt.v1");
    if (!read.ok) throw new Error("read failed");
    expect(dec(read.value)).toBe("v1 content");
  });

  it("does not affect the source after snapshot", async () => {
    await driver.write("doc.txt", enc("original"));
    await driver.snapshot("doc.txt", "snap.txt");
    await driver.write("doc.txt", enc("updated"));

    const snap = await driver.read("snap.txt");
    if (!snap.ok) throw new Error("read failed");
    expect(dec(snap.value)).toBe("original"); // snapshot is frozen
  });

  it("fails with ALREADY_EXISTS when snapshot key is taken", async () => {
    await driver.write("doc.txt", enc("data"));
    await driver.snapshot("doc.txt", "snap.txt");
    const result = await driver.snapshot("doc.txt", "snap.txt");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ALREADY_EXISTS");
  });

  it("fails with COPY_SRC_MISSING when source doesn't exist", async () => {
    const result = await driver.snapshot("absent.txt", "snap.txt");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("COPY_SRC_MISSING");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Polymorphism — use via the StorageDriver interface
// ─────────────────────────────────────────────────────────────────────────────

describe("StorageDriver interface contract", () => {
  it("InMemoryStorageDriver satisfies StorageDriver", () => {
    // Type assertion — if this compiles and runs, the interface is satisfied.
    const d: StorageDriver = new InMemoryStorageDriver();
    expect(d).toBeDefined();
  });

  it("full round-trip: write → read → stat → delete → missing", async () => {
    const d: StorageDriver = new InMemoryStorageDriver();

    const w = await d.write("rt/obj", enc("round-trip"), {
      mimeType: "text/plain",
    });
    expect(w.ok).toBe(true);

    const r = await d.read("rt/obj");
    expect(r.ok).toBe(true);
    if (r.ok) expect(dec(r.value)).toBe("round-trip");

    const s = await d.stat("rt/obj");
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.value.sizeBytes).toBe(10);

    const del = await d.delete("rt/obj");
    expect(del.ok).toBe(true);

    const gone = await d.read("rt/obj");
    expect(gone.ok).toBe(false);
    if (!gone.ok) expect(gone.error.code).toBe("NOT_FOUND");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. MIME allow-list enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("MIME type allow-list", () => {
  it("accepts all MIME types when none are specified", async () => {
    const result = await driver.write("x.bin", enc("data"), {
      mimeType: "model/gltf-binary",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects MIME types not on the allow-list during copy", async () => {
    const strict = new InMemoryStorageDriver({
      allowedMimeTypes: ["text/plain"],
    });
    await strict.write("src.txt", enc("data"), { mimeType: "text/plain" });
    const result = await strict.copy("src.txt", "dst.bin", {
      mimeType: "image/png",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_MIME");
  });
});
