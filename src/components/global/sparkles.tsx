'use client'

import React, { useState } from 'react'
import Particles from '@tsparticles/react'
import type { Container } from '@tsparticles/engine'
import { motion, useAnimation } from 'framer-motion'

import { cn } from '@/lib/utils'

type ParticlesProps = {
  id?: string
  className?: string
  background?: string
  particleSize?: number
  minSize?: number
  maxSize?: number
  speed?: number
  particleColor?: string
  particleDensity?: number
}

export const SparklesCore = (props: ParticlesProps) => {
  const {
    id,
    className,
    background,
    minSize,
    maxSize,
    speed,
    particleColor,
    particleDensity,
  } = props

  const [ready] = useState(true)
  const controls = useAnimation()

  const particlesLoaded = async (container?: Container) => {
    if (!container) return

    console.log(container)
    await controls.start({
      opacity: 1,
      transition: { duration: 1 },
    })
  }

  const options = {
    background: {
      color: {
        value: background || '#0d47a1',
      },
    },
    fullScreen: {
      enable: false,
      zIndex: 1,
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onClick: { enable: true, mode: 'push' },
        onHover: { enable: false, mode: 'repulse' },
        resize: true,
      },
      modes: {
        push: { quantity: 4 },
        repulse: { distance: 200, duration: 0.4 },
      },
    },
    particles: {
      color: {
        value: particleColor || '#ffffff',
      },
      move: {
        enable: true,
        speed: { min: 0.1, max: 1 },
        direction: 'none',
        random: false,
        straight: false,
        outModes: 'out',
      },
      number: {
        density: { enable: true, area: 800 },
        value: particleDensity || 120,
      },
      opacity: {
        value: { min: 0.1, max: 1 },
        animation: {
          enable: true,
          speed: speed || 4,
          minimumValue: 0.1,
          sync: false,
        },
      },
      shape: {
        type: 'circle',
      },
      size: {
        value: { min: minSize || 1, max: maxSize || 3 },
      },
    },
    detectRetina: true,
  } as any

  return (
    <motion.div animate={controls} className={cn('opacity-0', className)}>
      {ready && (
        <Particles
          id={id || 'tsparticles'}
          className={cn('h-full w-full')}
          particlesLoaded={particlesLoaded}
          options={options}
        />
      )}
    </motion.div>
  )
}