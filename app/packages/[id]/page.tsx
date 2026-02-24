import Link from "next/link"
import SiteHeader from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { sql } from "@/server/db"

const WHATSAPP_PHONE = "201503860035"

function makeWhatsAppUrl(pkgName: string) {
  const text = `Hi, I would like to purchase the "${pkgName}" package from El-Helal. Please let me know how to proceed.`
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
}

// Simple server-side query: get package info + its videos (public, no auth required).
async function getPackageWithVideos(packageId: string) {
  const [pkg] = (await sql`
    SELECT id, teacher_id, name, description, price, thumbnail_url, grades
    FROM packages
    WHERE id = ${packageId}
    LIMIT 1;
  `) as any[]

  if (!pkg) return null

  const videos = (await sql`
    SELECT id, title, description, category, is_free, month, thumbnail_url
    FROM videos
    WHERE package_id = ${packageId}
    ORDER BY created_at ASC;
  `) as any[]

  return { pkg, videos }
}

export default async function PackagePage({ params }: { params: { id: string } }) {
  const packageId = params.id
  const data = await getPackageWithVideos(packageId)

  if (!data) {
    return (
      <main>
        <SiteHeader />
        <div className="mx-auto max-w-4xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Package not found</CardTitle>
              <CardDescription>The requested package does not exist.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/" className="underline">
                Go back home
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const { pkg, videos } = data

  const priceLabel =
    typeof pkg.price === "number" && pkg.price > 0
      ? (pkg.price / 100).toLocaleString("en-EG", {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 0,
      })
      : "Free"

  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
        {/* Package Header Card */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              {pkg.thumbnail_url && (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-muted">
                  <img
                    src={pkg.thumbnail_url}
                    alt={pkg.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="space-y-2">
                <CardTitle className="text-xl sm:text-2xl">{pkg.name}</CardTitle>
                {pkg.description && (
                  <CardDescription className="max-w-2xl whitespace-pre-line text-sm">
                    {pkg.description}
                  </CardDescription>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{priceLabel}</Badge>
                  <Badge variant="secondary">{videos.length} video(s)</Badge>
                </div>
              </div>
            </div>

            {/* WhatsApp Purchase Button / Entry Button */}
            <div className="shrink-0">
              <Button asChild className="w-full sm:w-auto">
                <a href={pkg.price > 0 ? makeWhatsAppUrl(pkg.name) : "/student"} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {pkg.price > 0 ? "Purchase on WhatsApp" : "Access for Free"}
                </a>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Videos List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">What's included in this package</h2>
            <span className="text-xs text-muted-foreground">{videos.length} lesson(s)</span>
          </div>

          {videos.length === 0 && (
            <p className="text-sm text-muted-foreground">No videos have been added to this package yet.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <Card key={v.id} className="h-full overflow-hidden">
                <CardContent className="flex flex-col gap-2 p-3">
                  {v.thumbnail_url && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                      <img
                        src={v.thumbnail_url}
                        alt={v.title ?? "Video thumbnail"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      {v.category && <Badge variant="outline">{v.category}</Badge>}
                      {typeof v.is_free === "boolean" && (
                        <Badge variant={v.is_free ? "default" : "secondary"}>
                          {v.is_free ? "Free" : "Paid"}
                        </Badge>
                      )}
                      {typeof v.month === "number" && <Badge variant="secondary">Month {v.month}</Badge>}
                    </div>
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{v.title || "Lesson"}</p>
                    {v.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{v.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="font-semibold">{pkg.price > 0 ? "Ready to start learning?" : "Start learning now!"}</p>
              <p className="text-sm text-muted-foreground">
                {pkg.price > 0
                  ? "Contact us on WhatsApp to purchase this package and get instant access."
                  : "Login to your dashboard to access this package for free."}
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <a href={pkg.price > 0 ? makeWhatsAppUrl(pkg.name) : "/student"} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                {pkg.price > 0 ? "Buy Now on WhatsApp" : "Login to Start"}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
