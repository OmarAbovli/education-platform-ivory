export default function SectionHeader({
  eyebrow = "Explore",
  title = "Title",
  subtitle = "Subtitle",
}: {
  eyebrow?: string
  title?: string
  subtitle?: string
}) {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] text-foreground/80 shadow-sm backdrop-blur">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}
