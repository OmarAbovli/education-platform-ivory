"use client"

import { useMemo, useRef, Suspense } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import { Environment, Float, Html, OrbitControls, Sparkles, Text, useGLTF } from "@react-three/drei"
import { TextureLoader, type Mesh } from "three"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const SafeCanvas = dynamic(() => import("@/components/safe-canvas").then((mod) => mod.SafeCanvas), { ssr: false })

function Planet() {
  const tex = useLoader(TextureLoader, "/assets/3d/texture_earth.jpg", (loader) => {
    loader.crossOrigin = "anonymous"
  })
  const ref = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12
  })
  return (
    <mesh ref={ref} position={[0, 0.5, 0]} castShadow receiveShadow>
      <sphereGeometry args={[1.4, 64, 64]} />
      <meshStandardMaterial map={tex} roughness={0.9} metalness={0.05} />
    </mesh>
  )
}

function Rings() {
  const rings = useMemo(() => [1.8, 2.4, 3.0], [])
  return (
    <>
      {rings.map((r, i) => (
        <Float key={r} rotationIntensity={0.25} floatIntensity={0.6} speed={0.8 + i * 0.2}>
          <mesh rotation={[Math.PI / 2.2, 0, (i + 1) * 0.45]}>
            <torusGeometry args={[r, 0.035, 32, 280]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#10b981" : "#14b8a6"}
              emissive={i % 2 === 0 ? "#10b981" : "#14b8a6"}
              emissiveIntensity={0.2}
              roughness={0.5}
              metalness={0.3}
            />
          </mesh>
        </Float>
      ))}
    </>
  )
}

function Duck() {
  const { scene } = useGLTF("/assets/3d/duck.glb")
  const ref = useRef<Mesh>(null)
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ref.current) {
      ref.current.rotation.y = Math.sin(t * 0.7) * 0.4
      ref.current.position.y = 0.6 + Math.sin(t * 2) * 0.08
    }
  })
  return (
    <Float rotationIntensity={0.4} floatIntensity={0.8} speed={1.2}>
      <primitive object={scene} ref={ref} position={[2.1, 0.6, 0]} scale={1.25} />
    </Float>
  )
}

function WelcomeText({
  title = "El-helal",
  subtitle = "Learn • Play • Master",
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <Float rotationIntensity={0.15} floatIntensity={0.4} speed={1}>
      <Text
        position={[0, 2.2, 0]}
        font="/fonts/Inter_Bold.json"
        fontSize={0.5}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#10b981"
      >
        {title}
      </Text>
      <Text
        position={[0, 1.7, 0]}
        font="/fonts/Inter_Regular.json"
        fontSize={0.26}
        color="#065f46"
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>
    </Float>
  )
}

function FallbackHero({
  ctaPrimaryHref,
  ctaSecondaryHref,
}: {
  ctaPrimaryHref: string
  ctaSecondaryHref: string
}) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(1200px 500px at 20% 10%, rgba(16,185,129,0.25), transparent 60%), radial-gradient(1200px 500px at 80% 20%, rgba(45,212,191,0.2), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
        }}
      />
      <div className="absolute -top-24 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="absolute bottom-10 left-10 h-40 w-40 animate-pulse rounded-full bg-teal-200/50 blur-2xl" />
      <div className="absolute right-10 top-20 h-32 w-32 animate-pulse rounded-full bg-emerald-100/60 blur-2xl" />

      <div className="z-10 mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
        <div className="rounded-full border bg-white/70 px-3 py-1 text-xs text-emerald-700 shadow-sm backdrop-blur">
          Built for curious minds — from first day to finals
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Spark curiosity. Build confidence.
        </h1>
        <p className="mx-auto max-w-lg text-pretty text-sm text-slate-600">
          Fun meets focus: lessons, games, and live sessions that keep you hooked while you learn.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href={ctaPrimaryHref}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Explore Teachers</Button>
          </a>
          <a href={ctaSecondaryHref}>
            <Button variant="outline" className="border-emerald-300 text-emerald-700 bg-transparent">
              Login
            </Button>
          </a>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-xs text-slate-500">
        Scroll to explore
      </div>
    </div>
  )
}

export function HomeHero3D({
  ctaPrimaryHref = "/teachers",
  ctaSecondaryHref = "/login",
}: {
  ctaPrimaryHref?: string
  ctaSecondaryHref?: string
}) {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(1200px 500px at 20% 10%, rgba(16,185,129,0.25), transparent 60%), radial-gradient(1200px 500px at 80% 20%, rgba(45,212,191,0.2), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
        }}
      />

      <SafeCanvas
        camera={{ position: [0, 2.1, 6], fov: 50 }}
        fallback={<FallbackHero ctaPrimaryHref={ctaPrimaryHref} ctaSecondaryHref={ctaSecondaryHref} />}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 6, 2]} intensity={1} castShadow />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <Sparkles count={180} scale={10} size={2} speed={0.45} opacity={0.5} color="#10b981" />
          <Planet />
          <Rings />
          <Duck />
          <WelcomeText />
          <Html center>
            <div className="flex max-w-xl flex-col items-center gap-5 text-center">
              <div className="rounded-full border bg-white/70 px-3 py-1 text-xs text-emerald-700 shadow-sm backdrop-blur">
                {"Built for curious minds — from first day to finals"}
              </div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                {"Spark curiosity. Build confidence."}
              </h1>
              <p className="mx-auto max-w-lg text-pretty text-sm text-slate-600">
                {"Fun meets focus: lessons, games, and live sessions that keep you hooked while you learn."}
              </p>
              <div className="pointer-events-auto flex flex-wrap justify-center gap-3">
                <a href={ctaPrimaryHref}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Explore Teachers</Button>
                </a>
                <a href={ctaSecondaryHref}>
                  <Button variant="outline" className="border-emerald-300 text-emerald-700 bg-transparent">
                    Login
                  </Button>
                </a>
              </div>
            </div>
          </Html>
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </SafeCanvas>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-xs text-slate-500">
        {"Scroll to explore"}
      </div>
    </div>
  )
}

useGLTF.preload("/assets/3d/duck.glb")
