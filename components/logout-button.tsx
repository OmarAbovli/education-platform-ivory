"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { logout } from "@/server/auth-actions"
import { Button } from "@/components/ui/button"

export function LogoutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      size="sm"
      variant="outline"
      className={className}
      onClick={() =>
        startTransition(async () => {
          await logout()
          router.push("/")
        })
      }
      disabled={isPending}
    >
      {isPending ? "Logging out..." : "Logout"}
    </Button>
  )
}
