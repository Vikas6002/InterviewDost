import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { siteConfig } from "../lib/siteConfig";
import Lenis from "lenis";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ChevronDown,
  Github,
  LogIn,
  Menu,
  Mic,
  Quote,
  X,
} from "lucide-react";

import Shery from "sheryjs/dist/Shery.js";
import { StarsBackground } from "./ui/stars-background";

gsap.registerPlugin(ScrollTrigger);

/* ─── Hooks ─── */

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);
}

function useScrollSpy() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function useGsapReveal(ref: React.RefObject<HTMLDivElement | null>, opts: { stagger?: number; y?: number } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = el.children;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        { opacity: 0, y: opts.y ?? 20 },
        { opacity: 1, y: 0, stagger: opts.stagger ?? 0.08, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 82%" }
        }
      );
    });
    return () => ctx.revert();
  }, [ref, opts.stagger, opts.y]);
}

/* ─── Components ─── */

function Navbar({ user, scrolled, onLogin, onDashboard }: {
  user: { avatarUrl: string; username: string } | null;
  scrolled: boolean;
  onLogin: () => void;
  onDashboard: () => void;
}) {
  const [mobile, setMobile] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          scrolled ? "border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-2xl" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <motion.a href="/" className="flex items-center gap-2.5" whileHover={{ scale: 1.02 }}>
            <div className="flex size-8 items-center justify-center rounded-none bg-white/10 ring-1 ring-white/10">
              <span className="text-xs font-bold text-white">ID</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">{siteConfig.name}</span>
          </motion.a>

          <div className="hidden items-center gap-5 md:flex">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <img src={user.avatarUrl} alt="" className="size-6 rounded-full ring-1 ring-white/10" />
                  {user.username}
                </div>
                <motion.button onClick={onDashboard} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="magnet rounded-none border border-white/15 px-4 py-1.5 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white">
                  Dashboard
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button onClick={onLogin} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="magnet rounded-none px-4 py-1.5 text-sm text-white/40 transition-colors hover:text-white">
                  Sign in
                </motion.button>
                <motion.button onClick={onLogin} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="magnet rounded-none bg-white px-4 py-1.5 text-sm font-medium text-[#0A0A0A] transition-all hover:bg-white/90">
                  Get started
                </motion.button>
              </div>
            )}
          </div>

          <button onClick={() => setMobile(!mobile)} className="text-white/40 hover:text-white md:hidden">
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobile && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-[57px] right-0 left-0 z-40 border-b border-white/[0.06] bg-[#0A0A0A]/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col gap-3 px-6 pb-6 pt-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2 pb-2 text-sm text-white/40">
                    <img src={user.avatarUrl} alt="" className="size-6 rounded-full ring-1 ring-white/10" />
                    {user.username}
                  </div>
                  <button onClick={() => { setMobile(false); onDashboard(); }}
                    className="w-full rounded-none border border-white/15 px-4 py-2 text-sm text-white/70">Dashboard</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setMobile(false); onLogin(); }}
                    className="w-full rounded-none px-4 py-2 text-sm text-white/40">Sign in</button>
                  <button onClick={() => { setMobile(false); onLogin(); }}
                    className="w-full rounded-none bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A]">Get started</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Hero({ user, onLogin, onDashboard }: { user: any; onLogin: () => void; onDashboard: () => void }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-28 pb-16 text-center">
      <StarsBackground />

      <div className="relative mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/40 backdrop-blur"
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          {siteConfig.tagline}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="text-white">{siteConfig.hero.title[0]}</span>
          <br />
          <span className="font-['Instrument_Serif'] italic bg-gradient-to-r from-white/90 via-white/50 to-white/20 bg-clip-text text-transparent px-4">
            {siteConfig.hero.title[1]}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/30"
        >
          {siteConfig.hero.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          {user ? (
            <motion.button onClick={onDashboard} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="magnet group inline-flex h-11 items-center gap-2 rounded-none bg-white px-6 text-sm font-medium text-[#0A0A0A] transition-all hover:bg-white/90">
              Start your interview <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          ) : (
            <>
              <motion.button onClick={onLogin} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="magnet inline-flex h-11 items-center rounded-none bg-white px-6 text-sm font-medium text-[#0A0A0A] transition-all hover:bg-white/90">
                <LogIn className="mr-2 size-3.5" /> Get started free
              </motion.button>
              <motion.button onClick={onLogin} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="magnet inline-flex h-11 items-center rounded-none border border-white/15 px-6 text-sm text-white/50 transition-all hover:border-white/30 hover:text-white">
                <Github className="mr-2 size-3.5" /> Sign in with GitHub
              </motion.button>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, { stagger: 0.06 });

  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">Everything you need to prepare</h2>
          <p className="mt-3 text-sm text-white/30">No signup forms, no scheduling — just your GitHub profile and a microphone.</p>
        </div>
        <div ref={ref} className="mt-16 grid gap-px overflow-hidden border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {siteConfig.features.map((f) => (
            <div key={f.title} className="group bg-[#0A0A0A] p-8 transition-all duration-500 hover:bg-white/[0.015]">
              <div className="mb-5 flex size-11 items-center justify-center bg-white/[0.04] transition-all duration-500 group-hover:bg-white/[0.08]">
                <f.icon className="size-5 text-white/40 transition-colors duration-500 group-hover:text-white/60" />
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/30">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, { stagger: 0.12 });

  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">How it works</h2>
          <p className="mt-3 text-sm text-white/30">From zero to your first interview in under a minute.</p>
        </div>
        <div ref={ref} className="mt-16 grid gap-12 md:grid-cols-3">
          {siteConfig.steps.map((s, i) => (
            <div key={s.num} className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="flex size-14 items-center justify-center bg-white/[0.04]">
                  <span className="text-lg font-semibold text-white/60">{s.num}</span>
                </div>
                {i < siteConfig.steps.length - 1 && (
                  <div className="absolute top-7 left-[calc(50%+2.5rem)] hidden h-px w-[calc(100%-5rem)] bg-white/[0.06] md:block" />
                )}
              </div>
              <h3 className="text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/30">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, { stagger: 0.1 });

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Senior Engineer at Stripe",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face",
      quote: "The AI asked about my Rust projects specifically. It felt like talking to a real interviewer who'd read my code.",
    },
    {
      name: "Marcus Johnson",
      role: "Full-Stack Developer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face",
      quote: "The instant feedback helped me identify weak spots I didn't know I had. Landed my dream role two weeks later.",
    },
    {
      name: "Priya Patel",
      role: "SWE Intern @ Google",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face",
      quote: "The voice-based format made the real interview feel familiar. Practicing at 2 AM was a game-changer.",
    },
  ];

  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">Trusted by engineers</h2>
          <p className="mt-3 text-sm text-white/30">Join hundreds who've used InterviewDost to prepare.</p>
        </div>
        <div ref={ref} className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur">
              <Quote className="mb-4 size-5 text-white/10" />
              <p className="text-sm leading-relaxed text-white/50">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="size-10 rounded-full object-cover ring-1 ring-white/10" />
                <div>
                  <div className="text-sm font-medium text-white/80">{t.name}</div>
                  <div className="text-xs text-white/30">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, { stagger: 0.06 });

  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">FAQ</h2>
          <p className="mt-3 text-sm text-white/30">Everything you need to know about {siteConfig.name}.</p>
        </div>
        <div ref={ref} className="mt-14 space-y-2">
          {siteConfig.faq.map((item, i) => (
            <div key={i} className="border border-white/[0.06] bg-white/[0.02]">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm text-white/60 hover:text-white/90"
              >
                <span>{item.q}</span>
                <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="size-3.5 text-white/20" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <div className="border-t border-white/[0.06] px-5 py-4 text-sm leading-relaxed text-white/30">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-6 py-8 text-center text-xs text-white/15">
      {siteConfig.name} &mdash; {siteConfig.tagline}
    </footer>
  );
}

/* ─── Page ─── */

export function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const scrolled = useScrollSpy();
  useLenis();

  useEffect(() => {
    Shery.mouseFollower({
      skew: true,
      ease: "cubic-bezier(0.23, 1, 0.320, 1)",
      duration: 0.5,
    });
    Shery.makeMagnet(".magnet", {
      ease: "cubic-bezier(0.23, 1, 0.320, 1)",
      duration: 0.5,
    });
    Shery.textAnimate(".shery-text", {
      style: 1,
      y: 10,
      delay: 0.05,
      duration: 0.8,
      ease: "cubic-bezier(0.23, 1, 0.320, 1)",
      multiplier: 0.05,
    });
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      <Navbar user={user} scrolled={scrolled} onLogin={() => navigate("/login")} onDashboard={() => navigate("/interview")} />
      <Hero user={user} onLogin={() => navigate("/login")} onDashboard={() => navigate("/interview")} />
      <Features />
      <Steps />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
}
