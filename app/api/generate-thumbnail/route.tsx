import { ImageResponse } from "next/og"
import { type NextRequest } from "next/server"

export const runtime = "edge"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const title = searchParams.get("title") || "Video Lesson"
    const description = searchParams.get("description") || ""
    const category = searchParams.get("category") || "Education"

    // Pick a color based on category
    const colorMap: Record<string, [string, string]> = {
        grammar: ["#1a1a2e", "#e94560"],
        vocab: ["#0d1b2a", "#1b998b"],
        listening: ["#1a0533", "#9b5de5"],
        speaking: ["#0a1628", "#f77f00"],
        exam: ["#1a0a0a", "#e63946"],
        default: ["#0f172a", "#10b981"],
    }
    const key = Object.keys(colorMap).find(k => category.toLowerCase().includes(k)) ?? "default"
    const [bg, accent] = colorMap[key]

    // Limit text lengths
    const titleText = title.slice(0, 60)
    const descText = description.slice(0, 100)

    return new ImageResponse(
        (
            <div
                style={{
                    width: "1280px",
                    height: "720px",
                    display: "flex",
                    flexDirection: "column",
                    background: bg,
                    padding: "60px",
                    position: "relative",
                    fontFamily: "sans-serif",
                    overflow: "hidden",
                }}
            >
                {/* Background glow */}
                <div style={{
                    position: "absolute",
                    top: "-100px",
                    right: "-100px",
                    width: "500px",
                    height: "500px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${accent}60 0%, transparent 70%)`,
                    display: "flex",
                }} />
                <div style={{
                    position: "absolute",
                    bottom: "-80px",
                    left: "200px",
                    width: "400px",
                    height: "400px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
                    display: "flex",
                }} />

                {/* Platform brand */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "auto",
                }}>
                    <div style={{
                        background: accent,
                        padding: "8px 20px",
                        borderRadius: "100px",
                        fontSize: "22px",
                        fontWeight: 700,
                        color: "white",
                        letterSpacing: "1px",
                    }}>
                        YourPlatform
                    </div>
                    <div style={{
                        marginLeft: "16px",
                        fontSize: "20px",
                        color: `${accent}cc`,
                        fontWeight: 500,
                    }}>
                        {category}
                    </div>
                </div>

                {/* Main title */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    marginTop: "auto",
                    marginBottom: "40px",
                }}>
                    <div style={{
                        fontSize: titleText.length > 30 ? "56px" : "72px",
                        fontWeight: 900,
                        color: "white",
                        lineHeight: 1.1,
                        textShadow: `0 0 40px ${accent}80`,
                        maxWidth: "900px",
                    }}>
                        {titleText}
                    </div>

                    {descText && (
                        <div style={{
                            fontSize: "28px",
                            color: "#94a3b8",
                            maxWidth: "800px",
                            lineHeight: 1.4,
                        }}>
                            {descText}
                        </div>
                    )}
                </div>

                {/* Bottom accent bar */}
                <div style={{
                    position: "absolute",
                    bottom: "0",
                    left: "0",
                    right: "0",
                    height: "6px",
                    background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                    display: "flex",
                }} />

                {/* Side accent line */}
                <div style={{
                    position: "absolute",
                    top: "60px",
                    bottom: "60px",
                    left: "0",
                    width: "4px",
                    background: accent,
                    borderRadius: "0 4px 4px 0",
                    display: "flex",
                }} />

                {/* Decorative circles */}
                <div style={{
                    position: "absolute",
                    right: "60px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    alignItems: "center",
                }}>
                    {["📚", "🎯", "⭐"].map((emoji, i) => (
                        <div key={i} style={{
                            width: "72px",
                            height: "72px",
                            borderRadius: "50%",
                            background: `${accent}20`,
                            border: `2px solid ${accent}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "32px",
                        }}>
                            {emoji}
                        </div>
                    ))}
                </div>
            </div>
        ),
        {
            width: 1280,
            height: 720,
        }
    )
}
