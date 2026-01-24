"use client"

import { useRef, useMemo, useState, useEffect, Component, ReactNode } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

// Check if WebGL is available
function isWebGLAvailable(): boolean {
    if (typeof window === 'undefined') return false
    try {
        const canvas = document.createElement('canvas')
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        )
    } catch (e) {
        return false
    }
}

// Error Boundary to catch WebGL crashes
class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }> {
    state = { hasError: false }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error: Error) {
        console.warn('WebGL Error caught:', error.message)
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback
        }
        return this.props.children
    }
}

// Static fallback background (no WebGL needed)
function StaticBackground() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-teal-900/40 via-transparent to-teal-900/20" />
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }} />
            </div>
        </div>
    )
}

function WaveParticles() {
    const pointsRef = useRef<THREE.Points>(null!)

    // Grid settings
    const amountX = 60
    const amountY = 60
    const numPoints = amountX * amountY
    const separation = 0.12

    const positions = useMemo(() => {
        const coords = new Float32Array(numPoints * 3)
        let i = 0
        for (let ix = 0; ix < amountX; ix++) {
            for (let iy = 0; iy < amountY; iy++) {
                coords[i] = ix * separation - (amountX * separation) / 2
                coords[i + 1] = 0
                coords[i + 2] = iy * separation - (amountY * separation) / 2
                i += 3
            }
        }
        return coords
    }, [])

    useFrame((state) => {
        const time = state.clock.getElapsedTime() * 0.5
        const { mouse } = state
        const array = pointsRef.current.geometry.attributes.position.array as Float32Array

        let i = 0
        for (let ix = 0; ix < amountX; ix++) {
            for (let iy = 0; iy < amountY; iy++) {
                const xOffset = ix * 0.2
                const yOffset = iy * 0.2

                // Base wave motion
                let y = (Math.sin(xOffset + time) + Math.cos(yOffset + time * 0.5)) * 0.15

                // Mouse influence
                const x = array[i]
                const z = array[i + 2]

                // Map mouse -1 to 1 to our grid size roughly (-4 to 4)
                const mouseX = mouse.x * 4
                const mouseY = mouse.y * 4

                const dx = x - mouseX
                const dz = z + mouseY // Mouse Y is inverted in screen space vs 3D Z
                const dist = Math.sqrt(dx * dx + dz * dz)

                if (dist < 1.0) {
                    // Add a "bump" where the mouse is
                    y += (1.0 - dist) * 0.4
                }

                array[i + 1] = y
                i += 3
            }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.025}
                color="#99f6e4" // Brighter Teal (Teal 200)
                transparent
                opacity={0.9}
                sizeAttenuation={true}
                depthWrite={false}
            />
        </points>
    )
}

export default function ParticleBackground() {
    const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null)

    useEffect(() => {
        // Check WebGL support on mount (client-side only)
        setWebGLSupported(isWebGLAvailable())
    }, [])

    // Still checking (SSR or initial render)
    if (webGLSupported === null) {
        return <StaticBackground />
    }

    // WebGL not supported - show static fallback
    if (!webGLSupported) {
        return <StaticBackground />
    }

    // WebGL supported - try to render with error boundary
    return (
        <WebGLErrorBoundary fallback={<StaticBackground />}>
            <div className="absolute inset-0 z-0 pointer-events-none">
                <Canvas camera={{ position: [0, 1.8, 4.5], fov: 60 }}>
                    <fog attach="fog" args={["#0d9488", 3, 10]} />
                    <ambientLight intensity={0.8} />
                    <WaveParticles />
                </Canvas>

                {/* Overlay Glow - Removed Blur for clarity */}
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/40 via-transparent to-teal-900/20" />

                {/* Subtle radial mask to focus center */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(13,148,136,0.2)_100%)]" />
            </div>
        </WebGLErrorBoundary>
    )
}

