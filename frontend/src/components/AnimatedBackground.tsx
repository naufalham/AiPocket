"use client";

import { useEffect, useRef } from "react";

export function AnimatedBackground() {
  const bgRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bg = bgRef.current;
    const grid = gridRef.current;
    const particlesContainer = particlesRef.current;
    if (!bg || !grid || !particlesContainer) return;

    // Create particles
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement("div");
      particle.className = "auto-particle";
      particle.style.left = Math.random() * 100 + "%";
      particle.style.animationDuration = 15 + Math.random() * 15 + "s";
      particle.style.animationDelay = Math.random() * 5 + "s";
      particle.style.setProperty("--drift", (Math.random() - 0.5) * 200 + "px");

      if (Math.random() > 0.5) {
        particle.style.background = "#FF00FF";
        particle.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.6)";
      }

      particlesContainer.appendChild(particle);
    }

    // Animate background gradient
    let angle = 0;
    const interval = setInterval(() => {
      angle += 0.5;
      const x = Math.sin(angle * 0.01) * 30;
      const y = Math.cos(angle * 0.01) * 30;

      bg.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
      grid.style.transform = `translate(${x * -0.3}px, ${y * -0.3}px)`;
    }, 50);

    return () => {
      clearInterval(interval);
      while (particlesContainer.firstChild) {
        particlesContainer.removeChild(particlesContainer.firstChild);
      }
    };
  }, []);

  return (
    <>
      <div ref={bgRef} className="animated-bg" />
      <div ref={gridRef} className="grid-overlay" />
      <div ref={particlesRef} className="auto-particles-container" />
    </>
  );
}
