'use client'

import { createContext, useContext } from "react"
import type { User } from "lucia"

// The user object shape available in client components via useAuth()
export type SessionUser = User & {
  name: string | null
  grade: number | null
  avatar_url: string | null
}

interface AuthContextType {
  user: SessionUser | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ user, children }: { user: SessionUser | null; children: React.ReactNode }) {
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
