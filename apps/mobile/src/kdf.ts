import type { Kdf } from "@algone/core";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/** PBKDF2-SHA-256 without WebCrypto. Same output as `webKdf`, and it yields to the UI. */
export const mobileKdf: Kdf = async (password, salt, iterations) =>
  bytesToHex(
    await pbkdf2Async(sha256, utf8ToBytes(password), utf8ToBytes(salt), {
      c: iterations,
      dkLen: 32,
    }),
  );
