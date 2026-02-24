"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"
import { Environment, Stars, Sky, Float, Sparkles } from "@react-three/drei"

const SafeCanvas = dynamic(() => import("@/components/safe-canvas").then((mod) => mod.SafeCanvas), { ssr: false })
import { useFrame } from "@react-three/fiber"

// Small easing helper for nicer fades
function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

// Subtle camera rig for depth and parallax with the mouse
function CameraRig({ strength = 0.14 }: { strength?: number }) {
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const px = state.pointer.x
    const py = state.pointer.y
    const target = new THREE.Vector3(px * strength, py * strength, state.camera.position.z)
    state.camera.position.lerp(target, 0.05)
    const idle = Math.sin(t * 0.25) * 0.015
    state.camera.position.y += idle
    state.camera.lookAt(0, 0, -1)
  })
  return null
}

// A simple "bird" made of a cone that gently flaps and glides across the sky
function Bird({
  startX = -40,
  endX = 40,
  baseY = 4,
  speed = 0.8 + Math.random() * 0.6,
  scale = 0.7,
  color = "#2f3b57",
}: {
  startX?: number
  endX?: number
  baseY?: number
  speed?: number
  scale?: number
  color?: string
}) {
  const ref = useRef<THREE.Group>(null)
  const flap = useRef(Math.random() * Math.PI * 2)
  const dir = useMemo(() => (Math.random() > 0.5 ? 1 : -1), [])
  // Randomize lane and phase
  const lane = useMemo(() => baseY + (Math.random() - 0.5) * 2.5, [baseY])

  useFrame((_, delta) => {
    if (!ref.current) return
    flap.current += delta * 8
    // Horizontal movement
    const g = ref.current
    g.position.x += delta * speed * dir
    // Gentle heave and slight wandering
    g.position.y = lane + Math.sin(g.position.x / 6 + flap.current * 0.15) * 0.6
    g.position.z = -30 + Math.sin(g.position.x / 8 + flap.current * 0.07) * 2
    // Face direction
    g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2
    // Wrap around
    if (dir > 0 && g.position.x > endX) g.position.x = startX
    if (dir < 0 && g.position.x < startX) g.position.x = endX
  })

  return (
    <group ref={ref} position={[startX + Math.random() * 10, lane, -30]} scale={scale}>
      {/* Body */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.18, 0.8, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.0} />
      </mesh>
      {/* Wings (two thin planes flapping subtly) */}
      <mesh position={[0.05, 0.02, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.02, 0.6, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0.05, -0.02, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.02, 0.6, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  )
}

// Decorative sun with soft emissive glow
function Sun() {
  return (
    <Float speed={0.3} rotationIntensity={0.1} floatIntensity={0.3}>
      <mesh position={[12, 9, -80]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          color={"#ffd27a"}
          emissive={"#ffd27a"}
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.0}
        />
      </mesh>
    </Float>
  )
}

function NightScene() {
  const moonColor = "#f5f1dd"
  return (
    <>
      <color attach="background" args={["#060913"]} />
      <fog attach="fog" args={["#060913", 40, 300]} />
      <ambientLight intensity={0.25} color={"#a0b6ff"} />
      <directionalLight position={[20, 30, -10]} intensity={0.35} color={"#9bbcff"} />
      <Stars radius={240} depth={65} count={4200} factor={4} saturation={0} fade speed={0.5} />
      <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.6}>
        <mesh position={[-10, 11, -70]}>
          <sphereGeometry args={[3.3, 64, 64]} />
          <meshStandardMaterial color={moonColor} emissive={moonColor} emissiveIntensity={0.38} roughness={1} />
        </mesh>
      </Float>
      <Environment preset="night" />
      <CameraRig strength={0.12} />
    </>
  )
}

function DayScene() {
  // Morning feel via Sky + warm ambient + creative elements
  return (
    <>
      <color attach="background" args={["#d7f0ff"]} />
      <fog attach="fog" args={["#cfefff", 90, 420]} />
      <ambientLight intensity={0.9} color={"#fff2d6"} />
      <directionalLight position={[-22, 36, -12]} intensity={0.65} color={"#ffe2a8"} />
      <Sky
        distance={450000}
        sunPosition={[-10, 3, -10]}
        inclination={0.46}
        azimuth={0.24}
        turbidity={5}
        rayleigh={2.9}
        mieCoefficient={0.011}
        mieDirectionalG={0.85}
      />
      {/* Lightweight cloud approximations (avoids drei Cloud component which can break with mismatched three versions) */}
      <group>
        <mesh position={[-8, 6.5, -48]} scale={[1.6, 0.6, 1]}>
          <planeGeometry args={[26, 6]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.45} depthWrite={false} roughness={1} />
        </mesh>
        <mesh position={[10, 8, -56]} scale={[1.8, 0.6, 1]}>
          <planeGeometry args={[24, 6]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.38} depthWrite={false} roughness={1} />
        </mesh>
        <mesh position={[0, 7, -52]} scale={[1.7, 0.6, 1]}>
          <planeGeometry args={[22, 6]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.34} depthWrite={false} roughness={1} />
        </mesh>
      </group>
      {/* Gentle sun and sparkles */}
      <Sun />
      <Sparkles count={120} size={2} speed={0.25} color="#ffffff" opacity={0.15} scale={[200, 60, 100]} />
      {/* A small flock of birds at different lanes/speeds */}
      <Bird baseY={4.5} speed={0.9} color="#2f3b57" />
      <Bird baseY={5.2} speed={1.05} scale={0.8} color="#3a4a6a" />
      <Bird baseY={3.6} speed={0.75} scale={0.65} color="#2b3b52" />
      <Bird baseY={6.1} speed={1.2} scale={0.9} color="#253247" />
      <Environment preset="dawn" />
      <CameraRig strength={0.1} />
    </>
  )
}

// CSS fallback for non-WebGL devices: semi-transparent gradients so 3D shows through when available
function CssFallback() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(230,246,255,0.35) 0%, rgba(207,239,255,0.35) 60%, rgba(184,225,255,0.35) 100%)",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: "linear-gradient(180deg, rgba(2,6,23,0.35) 0%, rgba(7,16,35,0.35) 70%, rgba(11,18,32,0.35) 100%)",
        }}
      />
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.2; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}

export default function Global3DBackground() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // We drive the displayed scene off currentIsDark, and animate when resolvedTheme changes
  const isDark = resolvedTheme === "dark"
  const [currentIsDark, setCurrentIsDark] = useState<boolean | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize current scene to the initial theme once mounted
  useEffect(() => {
    if (mounted && currentIsDark === null) {
      setCurrentIsDark(isDark)
    }
  }, [mounted, isDark, currentIsDark])

  // Animate crossfade when theme changes
  useEffect(() => {
    if (!mounted) return
    if (currentIsDark === null) return
    if (isDark === currentIsDark) return

    let raf = 0
    setTransitioning(true)

    // Fade in
    const durationIn = 280
    const startIn = performance.now()
    const fadeIn = (now: number) => {
      const t = Math.min(1, (now - startIn) / durationIn)
      setOverlayOpacity(easeInOutQuad(t))
      if (t < 1) {
        raf = requestAnimationFrame(fadeIn)
      } else {
        // Swap scene at peak
        setCurrentIsDark(isDark)
        // Fade out
        const durationOut = 360
        const startOut = performance.now()
        const fadeOut = (now2: number) => {
          const tt = Math.min(1, (now2 - startOut) / durationOut)
          setOverlayOpacity(1 - easeInOutQuad(tt))
          if (tt < 1) {
            raf = requestAnimationFrame(fadeOut)
          } else {
            setOverlayOpacity(0)
            setTransitioning(false)
          }
        }
        raf = requestAnimationFrame(fadeOut)
      }
    }
    raf = requestAnimationFrame(fadeIn)

    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [isDark, mounted, currentIsDark])

  // Avoid SSR mismatch: show CSS fallback until mounted
  if (!mounted || currentIsDark === null) return <CssFallback />

  // Overlay color depending on transition direction
  const overlayStyle =
    isDark !== currentIsDark
      ? isDark
        ? {
            // transitioning to dark
            background:
              "radial-gradient(1200px 800px at 50% -20%, rgba(12,18,32,0.8), rgba(4,8,20,0.9) 60%, rgba(2,6,17,1) 100%)",
          }
        : {
            // transitioning to light
            background:
              "radial-gradient(1200px 800px at 50% -20%, rgba(255,239,200,0.75), rgba(224,245,255,0.85) 60%, rgba(207,239,255,0.95) 100%)",
          }
      : { background: "transparent" }

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <SafeCanvas
        fallback={<CssFallback />}
        camera={{ position: [0, 0, 6], fov: 60, near: 0.1, far: 1000 }}
        frameloop="always"
        dpr={[1, 1.5]}
      >
        {/* Full-screen background 3D that reacts to theme, with crossfade */}
        <group position={[0, 0, 0]} key={currentIsDark ? "night" : "day"}>
          {currentIsDark ? <NightScene /> : <DayScene />}
        </group>
      </SafeCanvas>

      {/* Crossfade overlay (sits above the canvas but below your UI) */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          opacity: overlayOpacity,
          transition: transitioning ? "none" : "opacity 150ms ease",
          ...overlayStyle,
        }}
      />
    </div>
  )
}
