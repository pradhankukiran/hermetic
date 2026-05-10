import { describe, expect, it } from "vitest";

import {
  bytesToBase64Url,
  base64UrlToBytes,
  decryptBytes,
  encryptBytes,
  generateSymmetricKey,
  utf8Decode,
  utf8Encode,
} from "@/lib/crypto";

import { sleeperAad, type SleeperEnvelope } from "./sleeper";

/**
 * Envelope-level round-trip for Sleeper. The end-to-end create/open flow
 * touches `fetch`, IPFS, and the API — those are exercised in the page tests.
 * Here we lock down the crypto-shape contract: envelope bytes encrypted
 * under the Sleeper AAD round-trip back to the same envelope, and any
 * mismatch in AAD (cross-mode, version downgrade) hard-fails.
 */
describe("sleeper envelope", () => {
  it("round-trips an envelope under sleeperAad", async () => {
    const key = await generateSymmetricKey();
    const original: SleeperEnvelope = {
      v: 1,
      filename: "secret.txt",
      mimeType: "text/plain",
      size: 5,
      data: bytesToBase64Url(utf8Encode("hello")),
    };
    const sealed = await encryptBytes(
      key,
      utf8Encode(JSON.stringify(original)),
      sleeperAad(),
    );

    const opened = await decryptBytes(key, sealed, sleeperAad());
    const decoded = JSON.parse(utf8Decode(opened)) as SleeperEnvelope;

    expect(decoded).toEqual(original);
    expect(utf8Decode(base64UrlToBytes(decoded.data))).toBe("hello");
  });

  it("rejects cross-mode AAD (drop AAD cannot open a sleeper envelope)", async () => {
    const key = await generateSymmetricKey();
    const env = utf8Encode(
      JSON.stringify({
        v: 1,
        filename: "x",
        mimeType: "text/plain",
        size: 0,
        data: "",
      }),
    );
    const sealed = await encryptBytes(key, env, sleeperAad());
    const dropAad = utf8Encode("hermetic:drop:v=1");
    await expect(decryptBytes(key, sealed, dropAad)).rejects.toThrow();
  });

  it("rejects version downgrade in AAD", async () => {
    const key = await generateSymmetricKey();
    const env = utf8Encode(
      JSON.stringify({
        v: 1,
        filename: "x",
        mimeType: "text/plain",
        size: 0,
        data: "",
      }),
    );
    const v2 = utf8Encode("hermetic:sleeper:v=2");
    const sealed = await encryptBytes(key, env, v2);
    await expect(decryptBytes(key, sealed, sleeperAad())).rejects.toThrow();
  });
});
