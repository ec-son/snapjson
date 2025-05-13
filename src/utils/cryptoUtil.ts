import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const defaultKey = "abcde12345!@#$%_snapjaon@2.0.0_privateKey";
const defaultSalt = "snapjaon@2.0.0";
const ENCRYPT_MARK = "enc::";
export function encrypt(
  text: string,
  secretKey: string = defaultKey,
  salt: string = defaultSalt
): string {
  try {
    const iv = randomBytes(12);
    const key = scryptSync(secretKey, salt, 32);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return (
      ENCRYPT_MARK + Buffer.concat([iv, authTag, encrypted]).toString("base64")
    );
  } catch (error) {
    throw new Error(
      "Encryption failed: check that the secret key is valid and the text is properly formatted. AES-GCM requires a 12-byte IV and a 32-byte key."
    );
  }
}

export function decrypt(
  encryptedText: string,
  secretKey: string = defaultKey,
  salt: string = defaultSalt
): string {
  try {
    const data = Buffer.from(
      encryptedText.slice(ENCRYPT_MARK.length),
      "base64"
    );
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const key = scryptSync(secretKey, salt, 32);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(
      "Decryption failed: unable to decrypt. This may be due to an incorrect key, wrong salt, or tempered ciphertext."
    );
  }
}
