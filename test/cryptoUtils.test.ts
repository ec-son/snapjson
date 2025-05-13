import { encrypt, decrypt } from "../src/utils/cryptoUtil";

describe("Crypto (AES-256-GCM)", () => {
  const secretKey = "myStrongPassword";
  const salt = "custom-salt";
  const text = "Hello snapjson!";

  it("should encrypt and decrypt correctly with default salt", () => {
    const encrypted = encrypt(text, secretKey);
    const decrypted = decrypt(encrypted, secretKey);
    expect(decrypted).toBe(text);
  });

  it("should encrypt and decrypt correctly with custom salt", () => {
    const encrypted = encrypt(text, secretKey, salt);
    const decrypted = decrypt(encrypted, secretKey, salt);
    expect(decrypted).toBe(text);
  });

  it("should produce different ciphertext for same input due to random IV", () => {
    const encrypted1 = encrypt(text, secretKey);
    const encrypted2 = encrypt(text, secretKey);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should fail decryption with wrong key", () => {
    const encrypted = encrypt(text, secretKey);
    expect(() => decrypt(encrypted, "wrongKey")).toThrow();
  });

  it("should fail decryption with wrong salt", () => {
    const encrypted = encrypt(text, secretKey, salt);
    expect(() => decrypt(encrypted, secretKey, "wrong-salt")).toThrow();
  });
});
