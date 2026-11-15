import { describe, it, expect } from "vitest";
import { encryptPHI, decryptPHI } from "../../src/core/security/encryption";

describe("HIPAA Security: AES-256-GCM Field-Level PHI Encryption", () => {
  it("should encrypt and decrypt sensitive patient medical observations", () => {
    const sensitiveObservation = "Patient exhibited mild dizziness after morning Lisinopril dose. Blood pressure was 138/88.";
    const ciphertext = encryptPHI(sensitiveObservation);

    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toContain("Lisinopril");
    expect(ciphertext.split(":").length).toBe(3); // iv:authTag:encryptedData

    const decrypted = decryptPHI(ciphertext);
    expect(decrypted).toBe(sensitiveObservation);
  });

  it("should fail to decrypt if ciphertext has been tampered with", () => {
    const text = "Penicillin Allergy - Severe Anaphylaxis";
    const ciphertext = encryptPHI(text);
    const [iv, tag, data] = ciphertext.split(":");

    // Tamper with data
    const corruptedData = data.slice(0, -2) + (data.slice(-2) === "00" ? "ff" : "00");
    const corruptedCiphertext = `${iv}:${tag}:${corruptedData}`;

    expect(() => decryptPHI(corruptedCiphertext)).toThrow();
  });
});
