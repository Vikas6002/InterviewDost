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
  Quote,
  X,
  Check,
  Star,
  Sparkles,
  Code,
} from "lucide-react";

import { StarsBackground } from "./ui/stars-background";

gsap.registerPlugin(ScrollTrigger);

/* ─── Hooks ─── */

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
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

function useGsapReveal(
  ref: React.RefObject<HTMLDivElement | null>,
  opts: { stagger?: number; y?: number } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = el.children;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        { opacity: 0, y: opts.y ?? 20 },
        {
          opacity: 1,
          y: 0,
          stagger: opts.stagger ?? 0.08,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 82%" },
        },
      );
    });
    return () => ctx.revert();
  }, [ref, opts.stagger, opts.y]);
}

/* ─── Components ─── */

function Navbar({
  user,
  scrolled,
  onLogin,
  onDashboard,
}: {
  user: { avatarUrl: string; username: string } | null;
  scrolled: boolean;
  onLogin: () => void;
  onDashboard: () => void;
}) {
  const [mobile, setMobile] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobile(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          scrolled
            ? "border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-2xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <motion.a
            href="/"
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex size-8 items-center justify-center bg-white/10 ring-1 ring-white/10">
              <span className="text-xs font-bold text-white">ID</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              {siteConfig.name}
            </span>
          </motion.a>

          <div className="hidden items-center gap-6 md:flex">
            <button
              onClick={() => scrollTo("features")}
              className="text-xs text-white/30 transition-colors hover:text-white/70"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("paths")}
              className="text-xs text-white/30 transition-colors hover:text-white/70"
            >
              How it works
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="text-xs text-white/30 transition-colors hover:text-white/70"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollTo("faq")}
              className="text-xs text-white/30 transition-colors hover:text-white/70"
            >
              FAQ
            </button>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-6 rounded-full ring-1 ring-white/10"
                  />
                  {user.username}
                </div>
                <motion.button
                  onClick={onDashboard}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="magnet border border-white/15 px-4 py-1.5 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
                >
                  Dashboard
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={onLogin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="magnet px-4 py-1.5 text-sm text-white/40 transition-colors hover:text-white"
                >
                  Sign in
                </motion.button>
                <motion.button
                  onClick={onLogin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="magnet bg-white px-4 py-1.5 text-sm font-medium text-[#0A0A0A] transition-all hover:bg-white/90"
                >
                  Get started
                </motion.button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobile(!mobile)}
            className="text-white/40 hover:text-white md:hidden"
          >
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-[57px] right-0 left-0 z-40 border-b border-white/[0.06] bg-[#0A0A0A]/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col gap-3 px-6 pb-6 pt-4">
              {([
                ["Features", "features"],
                ["How it works", "paths"],
                ["Pricing", "pricing"],
                ["FAQ", "faq"],
              ] as const).map(([label, id]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="w-full px-4 py-2 text-left text-sm text-white/40 hover:text-white"
                >
                  {label}
                </button>
              ))}
              {user ? (
                <>
                  <div className="flex items-center gap-2 border-t border-white/[0.06] pt-4 text-sm text-white/40">
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="size-6 rounded-full ring-1 ring-white/10"
                    />
                    {user.username}
                  </div>
                  <button
                    onClick={() => {
                      setMobile(false);
                      onDashboard();
                    }}
                    className="w-full border border-white/15 px-4 py-2 text-sm text-white/70"
                  >
                    Dashboard
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobile(false);
                      onLogin();
                    }}
                    className="w-full px-4 py-2 text-sm text-white/40"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => {
                      setMobile(false);
                      onLogin();
                    }}
                    className="w-full bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A]"
                  >
                    Get started
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Hero({
  user,
  onLogin,
  onDashboard,
}: {
  user: any;
  onLogin: () => void;
  onDashboard: () => void;
}) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-28 pb-16 text-center">
      <StarsBackground />

      <div className="relative mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 inline-flex items-center gap-2 border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/40 backdrop-blur"
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
          transition={{
            duration: 0.7,
            delay: 0.2,
            ease: [0.25, 0.1, 0.25, 1],
          }}
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
          transition={{
            duration: 0.6,
            delay: 0.35,
            ease: [0.25, 0.1, 0.25, 1],
          }}
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
            <motion.button
              onClick={onDashboard}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="magnet group inline-flex h-11 items-center gap-2 bg-white px-6 text-sm font-medium text-[#0A0A0A] transition-all hover:bg-white/90"
            >
              Start your interview{" "}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          ) : (
            <>
              <motion.button
                onClick={onLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="magnet inline-flex h-11 items-center bg-white px-6 text-sm font-medium text-[#0A0A0A] transition-all hover:bg-white/90"
              >
                <LogIn className="mr-2 size-3.5" /> Get started free
              </motion.button>
              <motion.button
                onClick={onLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="magnet inline-flex h-11 items-center border border-white/15 px-6 text-sm text-white/50 transition-all hover:border-white/30 hover:text-white"
              >
                <Github className="mr-2 size-3.5" /> Sign in with GitHub
              </motion.button>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, { stagger: 0.04 });

  return (
    <section id="features" className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">
            Everything you need to ace your interview
          </h2>
          <p className="mt-3 text-sm text-white/30">
            From voice-based conversations to ATS resume checking — your complete interview preparation toolkit.
          </p>
        </div>
        <div
          ref={ref}
          className="mt-16 grid gap-px overflow-hidden border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {siteConfig.features.map((f) => (
            <div
              key={f.title}
              className="group bg-[#0A0A0A] p-8 transition-all duration-500 hover:bg-white/[0.015]"
            >
              <div className="mb-5 flex size-11 items-center justify-center bg-white/[0.04] transition-all duration-500 group-hover:bg-white/[0.08]">
                <f.icon className="size-5 text-white/40 transition-colors duration-500 group-hover:text-white/60" />
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/30">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="border-t border-white/[0.06] px-6 py-20 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="grid divide-x divide-white/[0.06] overflow-hidden border border-white/[0.06] bg-white/[0.02] md:grid-cols-4">
          {siteConfig.stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center px-6 py-10 text-center"
            >
              <span className="text-2xl font-bold text-white sm:text-3xl">
                {s.value}
              </span>
              <span className="mt-1.5 text-xs text-white/30">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="paths" className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">
            Two ways to prepare
          </h2>
          <p className="mt-3 text-sm text-white/30">
            Choose your path — GitHub or Resume. Both lead to a personalized AI interview experience.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {siteConfig.paths.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="border border-white/[0.06] bg-white/[0.02] p-8 md:p-10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex size-12 items-center justify-center bg-white/[0.04]">
                  <p.icon className="size-6 text-white/50" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                  <p className="text-xs text-white/30">{p.desc}</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-sm text-white/40">
                    <Check className="mt-0.5 size-3.5 text-emerald-400/70 shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AtsShowcase() {
  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-white/40 mb-5">
              <Sparkles className="size-3" /> New
            </div>
            <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic mb-3">
              ATS Resume Checker
            </h2>
            <p className="text-sm leading-relaxed text-white/30 mb-6">
              Upload your resume and a job description to get an instant ATS compatibility score.
              Our AI analyzes keyword matching, formatting, and skill alignment to help you
              pass Applicant Tracking Systems.
            </p>
            <ul className="space-y-2.5">
              {[
                "Keyword optimization analysis",
                "Format & structure recommendations",
                "Skill gap identification",
                "Actionable improvement suggestions",
              ].map((pt) => (
                <li key={pt} className="flex items-start gap-2.5 text-sm text-white/40">
                  <Check className="mt-0.5 size-3.5 text-emerald-400/70 shrink-0" />
                  {pt}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="border border-white/[0.06] bg-white/[0.02] p-8 md:p-10"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs text-white/30">ATS Score</span>
              <span className="text-xs text-white/30">Resume Analysis</span>
            </div>
            <div className="flex items-center justify-center mb-10">
              <div className="relative flex size-40 items-center justify-center">
                <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 128 128">
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke="white/[0.06]"
                    strokeWidth="6"
                  />
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke="rgb(52 211 153 / 0.5)"
                    strokeWidth="6"
                    strokeDasharray={`${(78 / 100) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                    strokeLinecap="butt"
                  />
                </svg>
                <span className="text-3xl font-bold text-white">78</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Keywords", value: "82%" },
                { label: "Format", value: "75%" },
                { label: "Skills", value: "80%" },
                { label: "Experience", value: "74%" },
              ].map((item) => (
                <div key={item.label} className="border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                  <div className="text-xs text-white/30">{item.label}</div>
                  <div className="text-base font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsPreview() {
  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="order-2 md:order-1"
          >
            <div className="border border-white/[0.06] bg-white/[0.02] p-8 md:p-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <div className="h-3 w-24 bg-white/[0.06] mb-2" />
                  <div className="h-2 w-32 bg-white/[0.04]" />
                </div>
                <div className="flex gap-2">
                  {[80, 65, 90].map((v, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-6 bg-white/[0.08]"
                        style={{ height: `${v * 0.3}px` }}
                      />
                      <span className="text-[10px] text-white/20">Q{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Technical", value: "8.2", color: "from-violet-400/50 to-violet-400/10" },
                  { label: "Problem Solving", value: "7.5", color: "from-emerald-400/50 to-emerald-400/10" },
                  { label: "Communication", value: "8.8", color: "from-blue-400/50 to-blue-400/10" },
                  { label: "Depth", value: "7.0", color: "from-amber-400/50 to-amber-400/10" },
                ].map((item) => (
                  <div key={item.label} className="border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-xs text-white/30">{item.label}</div>
                    <div className="text-lg font-semibold text-white mt-0.5">{item.value}</div>
                    <div className="mt-2 h-1 bg-white/[0.04]">
                      <div
                        className={`h-full bg-gradient-to-r ${item.color}`}
                        style={{ width: `${(parseFloat(item.value) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 md:order-2"
          >
            <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic mb-3">
              Deep analytics dashboard
            </h2>
            <p className="text-sm leading-relaxed text-white/30 mb-6">
              Track your performance across every interview with detailed radar charts,
              skill breakdowns, and progress trends. Identify your strengths and focus
              on areas that need improvement.
            </p>
            <ul className="space-y-2.5">
              {[
                "Radar charts for skill visualization",
                "Score trends over time",
                "Per-question performance breakdown",
                "Strengths & weaknesses analysis",
              ].map((pt) => (
                <li key={pt} className="flex items-start gap-2.5 text-sm text-white/40">
                  <Check className="mt-0.5 size-3.5 text-emerald-400/70 shrink-0" />
                  {pt}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PricingPreview() {
  return (
    <section id="pricing" className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">
            Simple pricing
          </h2>
          <p className="mt-3 text-sm text-white/30">
            Start with 50 free credits. Upgrade when you need more.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {siteConfig.pricing.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative border bg-white/[0.02] p-8 md:p-10 ${
                p.popular ? "border-white/20" : "border-white/[0.06]"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1">
                  <span className="text-xs font-medium text-[#0A0A0A]">Most Popular</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-semibold text-white">{p.name}</span>
                {p.popular && <Star className="size-3.5 text-amber-400/70" />}
              </div>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-3xl font-bold text-white">{p.price}</span>
                {p.credits !== "Unlimited" && (
                  <span className="text-sm text-white/30">/{p.credits}</span>
                )}
              </div>
              <div className="text-xs text-white/30 mt-1">{p.credits} credits</div>
              <ul className="mt-6 space-y-2.5 border-t border-white/[0.06] pt-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/40">
                    <Check className="mt-0.5 size-3.5 text-emerald-400/70 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`mt-8 w-full py-2.5 text-sm font-medium transition-all ${
                  p.popular
                    ? "bg-white text-[#0A0A0A] hover:bg-white/90"
                    : "border border-white/15 text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                {p.cta}
              </motion.button>
            </motion.div>
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
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face",
      quote:
        "The AI asked about my Rust projects specifically. It felt like talking to a real interviewer who'd read my code. The voice format made it so much more natural than typing.",
    },
    {
      name: "Marcus Johnson",
      role: "Full-Stack Developer",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face",
      quote:
        "The instant feedback helped me identify weak spots I didn't know I had. The ATS checker was the cherry on top — it helped me fix my resume and land interviews.",
    },
    {
      name: "Priya Patel",
      role: "SWE Intern @ Google",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face",
      quote:
        "Being able to practice at 2 AM with realistic voice interviews was a game-changer. The detailed analytics after each session showed me exactly what to improve.",
    },
    {
      name: "Alex Rivera",
      role: "Backend Engineer",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face",
      quote:
        "I used both the GitHub and resume paths and got completely different questions. The AI adapts remarkably well to whatever source material you give it.",
    },
  ];

  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">
            Trusted by engineers
          </h2>
          <p className="mt-3 text-sm text-white/30">
            Join hundreds who've used InterviewDost to prepare and land their dream roles.
          </p>
        </div>
        <div ref={ref} className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur"
            >
              <Quote className="mb-4 size-5 text-white/10" />
              <p className="text-sm leading-relaxed text-white/50">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="size-10 rounded-full object-cover ring-1 ring-white/10"
                />
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

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, { stagger: 0.06 });

  return (
    <section id="faq" className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="shery-text text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic">
            FAQ
          </h2>
          <p className="mt-3 text-sm text-white/30">
            Everything you need to know about {siteConfig.name}.
          </p>
        </div>
        <div ref={ref} className="mt-14 space-y-2">
          {siteConfig.faq.map((item, i) => (
            <div key={i} className="border border-white/[0.06] bg-white/[0.02]">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm text-white/60 hover:text-white/90"
              >
                <span>{item.q}</span>
                <motion.div
                  animate={{ rotate: open === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="size-3.5 text-white/20 shrink-0 ml-2" />
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

function CtaBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border border-white/[0.06] bg-white/[0.02] p-12 md:p-16"
        >
          <Code className="mx-auto size-8 text-white/20 mb-6" />
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-['Instrument_Serif'] italic mb-4">
            Ready to ace your next interview?
          </h2>
          <p className="text-sm text-white/30 mb-8 max-w-lg mx-auto">
            Join hundreds of engineers who've used InterviewDost to prepare for technical
            interviews. Start with 50 free credits — no commitment needed.
          </p>
          <motion.button
            onClick={() => navigate(user ? "/dashboard" : "/login")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="magnet inline-flex h-12 items-center gap-2 bg-white px-8 text-sm font-medium text-[#0A0A0A] transition-all hover:bg-white/90"
          >
            {user ? "Go to Dashboard" : "Get started free"}
            <ArrowRight className="size-4" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center bg-white/10 ring-1 ring-white/10">
              <span className="text-xs font-bold text-white">ID</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              {siteConfig.name}
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/20">
            <span>&copy; {new Date().getFullYear()} {siteConfig.name}</span>
            <span className="hidden sm:inline">&mdash;</span>
            <span>{siteConfig.tagline}</span>
          </div>
        </div>
      </div>
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
    document.querySelectorAll(".shery-text").forEach((el) => {
      const text = el.textContent || "";
      el.innerHTML = text
        .split("")
        .map((c) => `<span class="inline-block">${c === " " ? "&nbsp;" : c}</span>`)
        .join("");
      const chars = el.querySelectorAll("span");
      gsap.from(chars, {
        y: 10,
        opacity: 0,
        duration: 0.8,
        stagger: 0.05,
        ease: "cubic-bezier(0.23, 1, 0.320, 1)",
        scrollTrigger: { trigger: el, start: "top 80%" },
      });
    });
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      <Navbar
        user={user}
        scrolled={scrolled}
        onLogin={() => navigate("/login")}
        onDashboard={() => navigate("/dashboard")}
      />
      <Hero
        user={user}
        onLogin={() => navigate("/login")}
        onDashboard={() => navigate("/dashboard")}
      />
      <FeaturesGrid />
      <StatsBar />
      <HowItWorks />
      <AtsShowcase />
      <AnalyticsPreview />
      <PricingPreview />
      <Testimonials />
      <FaqSection />
      <CtaBanner />
      <Footer />
    </div>
  );
}
