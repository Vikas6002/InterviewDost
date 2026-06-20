import { useEffect, useRef } from "react";

export function MouseFollower() {
  const followerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let raf: number;
    const follower = followerRef.current;
    if (!follower) return;

    const onMouse = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      if (!follower) return;
      const { x, y } = posRef.current;
      follower.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMouse);
    raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMouse);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={followerRef}
      className="pointer-events-none fixed left-0 top-0 z-[9999] size-4 rounded-full bg-white/20 mix-blend-difference transition-[width,height] duration-300 ease-out"
      style={{ willChange: "transform" }}
    />
  );
}
