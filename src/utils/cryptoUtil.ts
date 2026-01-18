import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ENCRYPT_MARK = "enc::";
export function encrypt(text: string, secretKey: string, salt: string): string {
  if (!secretKey || secretKey.trim() === "") {
    throw new Error(
      "Encryption requires a custom secret key. Provide a strong, unique key for security."
    );
  }
  if (!salt || salt.trim() === "") {
    throw new Error(
      "Encryption requires a custom salt. Provide a unique salt value for security."
    );
  }

  try {
    const iv = randomBytes(12);
    const key = scryptSync(secretKey, salt, 32);
    const cipher = createCipheriv("aes-256-gcm", new Uint8Array(key), new Uint8Array(iv));
    const encrypted = Buffer.concat([
      cipher.update(text, "utf8") as Uint8Array,
      cipher.final() as Uint8Array,
    ]);
    const authTag = cipher.getAuthTag();

    return (
      ENCRYPT_MARK + Buffer.concat([iv as Uint8Array, authTag as Uint8Array, encrypted as Uint8Array]).toString("base64")
    );
  } catch (error) {
    throw new Error(
      "Encryption failed: Ensure the secret key is valid and text is properly formatted."
    );
  }
}

export function decrypt(
  encryptedText: string,
  secretKey: string,
  salt: string
): string {
  if (!secretKey || secretKey.trim() === "") {
    throw new Error(
      "Decryption requires a custom secret key. Provide the same key used for encryption."
    );
  }
  if (!salt || salt.trim() === "") {
    throw new Error(
      "Decryption requires a custom salt. Provide the same salt used for encryption."
    );
  }

  try {
    const data = Buffer.from(
      encryptedText.slice(ENCRYPT_MARK.length),
      "base64"
    );
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const key = scryptSync(secretKey, salt, 32);
    const decipher = createDecipheriv("aes-256-gcm", new Uint8Array(key), new Uint8Array(iv));
    decipher.setAuthTag(new Uint8Array(authTag));

    const decrypted = Buffer.concat([
      decipher.update(encrypted as Uint8Array) as Uint8Array,
      decipher.final() as Uint8Array,
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(
      "Decryption failed: Incorrect key, wrong salt, or corrupted ciphertext."
    );
  }
}
