export type Kdf = (password: string, salt: string, iterations: number) => Promise<string>;

export const WEB_ITERATIONS = 600_000;
export const MOBILE_ITERATIONS = 100_000;

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** PBKDF2-SHA-256 through WebCrypto. Hosts without WebCrypto inject their own Kdf. */
export const webKdf: Kdf = async (password, salt, iterations) => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
};

export function newSalt(): string {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function createPartnerBarrier(password: string, kdf: Kdf, iterations: number) {
  const salt = newSalt();
  return {
    type: "partner" as const,
    salt,
    iterations,
    hash: await kdf(password, salt, iterations),
    recoveryAt: null,
  };
}

export async function verifyPassword(
  password: string,
  barrier: { salt: string; hash: string; iterations: number },
  kdf: Kdf,
): Promise<boolean> {
  return (await kdf(password, barrier.salt, barrier.iterations)) === barrier.hash;
}
