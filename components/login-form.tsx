"use client"

import { useActionState, useState } from "react"
import { passwordLogin, type PasswordLoginState } from "@/server/auth-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Eye, EyeOff, QrCode } from "lucide-react"
import Link from "next/link"

const initialState: PasswordLoginState = { ok: false, message: "" }

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(passwordLogin, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Card className="mx-auto w-full max-w-md bg-white/5 dark:bg-black/20 border-white/10 dark:border-zinc-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Enter your credentials</CardDescription>
      </CardHeader>
      <CardContent>
        {!state.ok && state.message ? (
          <Alert variant="destructive" className="mb-4" role="alert" aria-live="assertive" aria-atomic="true">
            <AlertTitle>Login failed</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="identifier">Username, Email, or Phone</Label>
            <Input
              id="identifier"
              name="identifier"
              placeholder="e.g. tfk_abc123"
              aria-invalid={Boolean(state.fieldErrors?.identifier) || undefined}
              aria-describedby={state.fieldErrors?.identifier ? "identifier-error" : undefined}
              required
              autoComplete="username"
              disabled={isPending}
            />
            {state.fieldErrors?.identifier ? (
              <p id="identifier-error" className="text-sm text-destructive">
                {state.fieldErrors.identifier}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs text-muted-foreground hover:underline"
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                aria-invalid={Boolean(state.fieldErrors?.password) || undefined}
                aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
                required
                autoComplete="current-password"
                disabled={isPending}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </span>
            </div>
            {state.fieldErrors?.password ? (
              <p id="password-error" className="text-sm text-destructive">
                {state.fieldErrors.password}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Signing in…" : "Login"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">أو</span>
            </div>
          </div>

          <Link href="/qr-scanner">
            <Button type="button" variant="outline" className="w-full" disabled={isPending}>
              <QrCode className="h-4 w-4 mr-2" />
              تسجيل الدخول بـ QR Code
            </Button>
          </Link>

          <p className="text-xs text-muted-foreground">
            Login is handled securely on the server via a Server Action. If you forgot your credentials, contact your
            teacher or an administrator.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
