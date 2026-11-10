import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
const N = 16384,
  r = 8,
  p = 5;
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      32,
      { N, r, p, maxmem: 32 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export function validPassword(password: string) {
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    Buffer.byteLength(password, "utf8") <= 512
  );
}
export function validHash(value: string | undefined): value is string {
  return (
    !!value && /^scrypt\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(value)
  );
}
export async function hashPassword(password: string) {
  if (!validPassword(password))
    throw Error("Use a password with 12 to 128 characters.");
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${N}$${r}$${p}$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(
  password: string,
  encoded: string | undefined,
) {
  if (!validHash(encoded) || password.length > 128) return false;
  const parts = encoded.split("$");
  return timingSafeEqual(
    await derive(password, parts[4]),
    Buffer.from(parts[5], "hex"),
  );
}
