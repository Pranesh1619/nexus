import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "nexus-bpo-crm-secret-token-key-2026-highly-secure";

// Helper to encode base64url according to RFC 7519 / RFC 4648
function base64urlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str) : str;
  return buf.toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Helper to decode base64url
function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Cryptographically signs a payload with HMAC-SHA256 and returns a JSON Web Token (JWT).
 */
export function signToken(payload: Record<string, unknown>, expiresInSeconds: number = 604800): string {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(signatureInput)
    .digest();

  const encodedSignature = base64urlEncode(signature);
  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Decodes and cryptographically verifies a JSON Web Token (JWT) signature and expiration.
 * Returns the decoded payload or null if invalid or expired.
 */
export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const signatureInput = `${header}.${payload}`;

    const expectedSignature = base64urlEncode(
      crypto
        .createHmac("sha256", JWT_SECRET)
        .update(signatureInput)
        .digest()
    );

    if (signature !== expectedSignature) {
      return null;
    }

    const decodedPayload = JSON.parse(base64urlDecode(payload)) as Record<string, unknown>;
    const exp = decodedPayload.exp as number | undefined;
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      return null; // Token has expired
    }

    return decodedPayload;
  } catch {
    return null;
  }
}
