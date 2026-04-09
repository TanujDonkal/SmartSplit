import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

let cachedJwksUrl: string | null = null;
let cachedJwks:
  | ReturnType<typeof createRemoteJWKSet>
  | null = null;

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL?.trim();

  if (!url) {
    throw new Error("SUPABASE_URL is not configured");
  }

  return url.replace(/\/+$/, "");
}

function getJwks() {
  const supabaseUrl = getSupabaseUrl();
  const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
    cachedJwksUrl = jwksUrl;
  }

  return cachedJwks;
}

export type SupabaseTokenClaims = JWTPayload & {
  email?: string;
  user_metadata?: {
    name?: string;
    username?: string;
  };
};

export async function verifySupabaseAccessToken(
  token: string,
): Promise<SupabaseTokenClaims> {
  const supabaseUrl = getSupabaseUrl();
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `${supabaseUrl}/auth/v1`,
  });

  return payload as SupabaseTokenClaims;
}
