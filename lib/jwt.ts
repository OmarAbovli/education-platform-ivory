import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-development-only-change-in-prod"
const key = new TextEncoder().encode(JWT_SECRET)

export type JWTPayload = {
  id: string
  role: "admin" | "teacher" | "student"
  name?: string | null
  grade?: number | null
}

export async function signJWT(payload: JWTPayload, expiresInStr: string = "365d"): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresInStr)
    .sign(key)
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    })
    return payload as JWTPayload
  } catch (error) {
    return null
  }
}
