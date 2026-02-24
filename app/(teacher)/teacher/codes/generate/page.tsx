import { getCurrentUser } from "../../../../../lib/auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sql } from "../../../../../server/db"
import GenerateCodesClientPage from "./generate-client"
import SiteHeader from "../../../../../components/site-header"

export const metadata = {
    title: "توليد أكواد جديدة | YourPlatform",
    description: "توليد أكواد وصول جديدة للباقات التعليمية",
}

export default async function GenerateCodesPage() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
        redirect("/login")
    }

    // Get teacher's packages
    const packages = await sql`
    SELECT id, name, grades
    FROM packages
    WHERE teacher_id = ${user.id}
    ORDER BY name ASC
  `

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />
            <GenerateCodesClientPage packages={packages as any} />
        </div>
    )
}
