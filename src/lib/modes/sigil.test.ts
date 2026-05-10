import { describe, expect, it } from "vitest";

import { utf8Decode, utf8Encode } from "@/lib/crypto";

import {
  openSigilEnvelope,
  sealSigilEnvelope,
  type SigilEnvelope,
} from "./sigil";

/**
 * These tests exercise the pure envelope path (no IPFS / network). The
 * createSigil / openSigil wrappers add Pinata upload + gateway fetch on
 * top of these, but the cryptographic correctness lives entirely in
 * sealSigilEnvelope / openSigilEnvelope.
 */

const RIDDLE = "What did we whisper at the diner?";

describe("sigil envelope", () => {
  it("round-trips a UTF-8 message", async () => {
    const plaintext = utf8Encode("the moon is, in fact, blue");
    const envelope = await sealSigilEnvelope({
      plaintext,
      witness: "the moon is blue",
      riddleQuestion: RIDDLE,
      filename: "note.txt",
      mimeType: "text/plain",
      kdf: "light",
    });

    const opened = await openSigilEnvelope(envelope, "the moon is blue");
    expect(utf8Decode(opened.bytes)).toBe("the moon is, in fact, blue");
    expect(opened.filename).toBe("note.txt");
    expect(opened.mimeType).toBe("text/plain");
  });

  it("round-trips binary content", async () => {
    const plaintext = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    const env = await sealSigilEnvelope({
      plaintext,
      witness: "passphrase-2024",
      riddleQuestion: RIDDLE,
      filename: "blob.bin",
      mimeType: "application/octet-stream",
      kdf: "light",
    });
    const opened = await openSigilEnvelope(env, "passphrase-2024");
    expect(opened.bytes).toEqual(plaintext);
  });

  it("preserves the riddle prompt verbatim in the envelope", async () => {
    const env = await sealSigilEnvelope({
      plaintext: utf8Encode("inside"),
      witness: "answer",
      riddleQuestion: RIDDLE,
      filename: "x",
      mimeType: "text/plain",
      kdf: "light",
    });
    expect(env.riddleQuestion).toBe(RIDDLE);
  });

  it("rejects an empty witness at seal time", async () => {
    await expect(
      sealSigilEnvelope({
        plaintext: utf8Encode("x"),
        witness: "",
        riddleQuestion: RIDDLE,
        filename: "x",
        mimeType: "text/plain",
      }),
    ).rejects.toThrow();
  });

  it("rejects an empty riddleQuestion at seal time", async () => {
    await expect(
      sealSigilEnvelope({
        plaintext: utf8Encode("x"),
        witness: "ok",
        riddleQuestion: "",
        filename: "x",
        mimeType: "text/plain",
      }),
    ).rejects.toThrow();
  });

  it("fails to open with the wrong witness", async () => {
    const env = await sealSigilEnvelope({
      plaintext: utf8Encode("inside"),
      witness: "right",
      riddleQuestion: RIDDLE,
      filename: "x",
      mimeType: "text/plain",
      kdf: "light",
    });
    await expect(openSigilEnvelope(env, "wrong")).rejects.toThrow(
      /wrong witness/i,
    );
  });

  it("rejects tampered ciphertext (AAD/AEAD integrity)", async () => {
    const env = await sealSigilEnvelope({
      plaintext: utf8Encode("integrity"),
      witness: "w",
      riddleQuestion: RIDDLE,
      filename: "x",
      mimeType: "text/plain",
      kdf: "light",
    });
    // Flip a bit by toggling one base64url character to a different valid one.
    const tampered: SigilEnvelope = {
      ...env,
      // Replace the first character with 'A' if it differs, else 'B' — keeps
      // it a valid base64url char so we exercise the AEAD path, not the
      // base64 decoder.
      ciphertext:
        (env.ciphertext[0] === "A" ? "B" : "A") + env.ciphertext.slice(1),
    };
    await expect(openSigilEnvelope(tampered, "w")).rejects.toThrow();
  });

  it("rejects an unsupported envelope version", async () => {
    const env = await sealSigilEnvelope({
      plaintext: utf8Encode("x"),
      witness: "w",
      riddleQuestion: RIDDLE,
      filename: "x",
      mimeType: "text/plain",
      kdf: "light",
    });
    const downgraded: SigilEnvelope = { ...env, v: 999 };
    await expect(openSigilEnvelope(downgraded, "w")).rejects.toThrow(
      /unsupported sigil envelope version/,
    );
  });

  it("two envelopes for the same plaintext + witness differ (fresh salt + key)", async () => {
    const a = await sealSigilEnvelope({
      plaintext: utf8Encode("same"),
      witness: "same",
      riddleQuestion: RIDDLE,
      filename: "x",
      mimeType: "text/plain",
      kdf: "light",
    });
    const b = await sealSigilEnvelope({
      plaintext: utf8Encode("same"),
      witness: "same",
      riddleQuestion: RIDDLE,
      filename: "x",
      mimeType: "text/plain",
      kdf: "light",
    });
    expect(a.salt).not.toBe(b.salt);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.wrappedKey).not.toBe(b.wrappedKey);
  });
});
