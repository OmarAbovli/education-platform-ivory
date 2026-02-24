"use client"

import { useMemo, useRef, Suspense } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import { Environment, Float, Html, OrbitControls, Sparkles, Text } from "@react-three/drei"
import { TextureLoader, type Mesh } from "three"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const SafeCanvas = dynamic(() => import("@/components/safe-canvas").then((mod) => mod.SafeCanvas), { ssr: false })

function SpinningEarth() {
  const earthTex = useLoader(TextureLoader, "/assets/3d/texture_earth.jpg", (loader) => {
    loader.crossOrigin = "anonymous"
  })
  const ref = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15
  })
  return (
    <mesh ref={ref} castShadow receiveShadow position={[0, 0.2, 0]}>
      <sphereGeometry args={[1.1, 48, 48]} />
      <meshStandardMaterial map={earthTex} roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

function FloatingRings() {
  const rings = useMemo(() => [1.6, 2.2, 2.8], [])
  return (
    <>
      {rings.map((r, i) => (
        <Float key={r} rotationIntensity={0.3} floatIntensity={0.6} speed={1 + i * 0.2}>
          <mesh rotation={[Math.PI / 2, 0, (i + 1) * 0.5]}>
            <torusGeometry args={[r, 0.02, 32, 200]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#10b981" : "#14b8a6"}
              emissive="#0ea5e9"
              emissiveIntensity={0.06}
            />
          </mesh>
        </Float>
      ))}
    </>
  )
}

function WelcomeText({ name = "Student" }: { name?: string }) {
  return (
    <Float rotationIntensity={0.2} floatIntensity={0.5} speed={1}>
      <Text
        position={[0, 1.9, 0]}
        font="/fonts/Inter_Bold.json"
        fontSize={0.36}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor="#10b981"
      >
        {`Welcome, ${name}`}
      </Text>
    </Float>
  )
}

function FallbackHero({ ctaHref }: { ctaHref: string }) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="absolute -inset-20 -z-10 rounded-[48px] bg-gradient-to-tr from-emerald-200/40 to-teal-200/40 blur-3xl" />
      <div className="z-10 mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
        <div className="rounded-full border bg-white/70 px-3 py-1 text-xs text-emerald-700 shadow-sm backdrop-blur">
          El-helal • Learn, grow, succeed        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Your journey starts today</h1>
        <p className="mx-auto max-w-xl text-pretty text-sm text-slate-600">
          Explore your lessons, track your progress, and join live sessions with your teacher.
        </p>
        <a href={ctaHref}>
          <Button className="bg-emerald-600 hover:bg-emerald-700">Start Learning</Button>
        </a>
      </div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 animate-bounce text-xs text-slate-500">
        Scroll to your content
      </div>
    </div>
  )
}

export function StudentHero3D({
  studentName = "Student",
  ctaHref = "#videos",
}: {
  studentName?: string
  ctaHref?: string
}) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <SafeCanvas camera={{ position: [0, 1.8, 5.2], fov: 50 }} fallback={<FallbackHero ctaHref={ctaHref} />}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 2]} intensity={1.0} castShadow />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <Sparkles count={160} scale={8} size={2} speed={0.4} opacity={0.5} color="#10b981" />
          <SpinningEarth />
          <FloatingRings />
          <WelcomeText name={studentName || "Student"} />
          <Html center>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full border bg-white/70 px-3 py-1 text-xs text-emerald-700 shadow-sm backdrop-blur">
                {"tafawok • Learn, grow, succeed"}
              </div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                {"Your journey starts today"}
              </h1>
              <p className="mx-auto max-w-xl text-pretty text-sm text-slate-600">
                {"Explore your lessons, track your progress, and join live sessions with your teacher."}
              </p>
              <div className="pointer-events-auto">
                <a href={ctaHref}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Start Learning</Button>
                </a>
              </div>
            </div>
          </Html>
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
      </SafeCanvas>

      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_60%)]"
        aria-hidden
      />

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 animate-bounce text-xs text-slate-500">
        {"Scroll to your content"}
      </div>
    </div>
  )
}
