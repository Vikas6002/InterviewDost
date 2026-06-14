import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { siteConfig } from "../lib/siteConfig";
import {
  ArrowRight,
  ChevronDown,
  Github,
  LogIn,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

export function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Nav */}
      <nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          scrolled ? "border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur" : ""
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <span className="text-xs font-bold text-white">ID</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {siteConfig.name}
            </span>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-6 rounded-full ring-1 ring-white/20"
                  />
                  {user.username}
                </div>
                <button
                  onClick={() => navigate("/interview")}
                  className="rounded-lg border border-white/20 px-4 py-1.5 text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white"
                >
                  Dashboard
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/login")}
                  className="rounded-lg px-4 py-1.5 text-sm text-white/50 transition-colors hover:text-white"
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-white/90"
                >
                  Get started
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="text-white/50 hover:text-white md:hidden"
          >
            {mobileMenu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {mobileMenu && (
        <div className="fixed top-[57px] right-0 left-0 z-40 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur md:hidden">
          <div className="flex flex-col gap-3 px-6 pb-6 pt-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 pb-2 text-sm text-white/50">
                  <img src={user.avatarUrl} alt="" className="size-6 rounded-full ring-1 ring-white/20" />
                  {user.username}
                </div>
                <button
                  onClick={() => { setMobileMenu(false); navigate("/interview"); }}
                  className="w-full rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80"
                >
                  Dashboard
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setMobileMenu(false); navigate("/login"); }}
                  className="w-full rounded-lg px-4 py-2 text-sm text-white/50"
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setMobileMenu(false); navigate("/login"); }}
                  className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A]"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
            {siteConfig.tagline}
          </div>

          <h1 className="text-3xl font-bold leading-snug tracking-tight sm:text-4xl md:text-5xl">
            <span className="text-white">{siteConfig.hero.title[0]}</span>
            <br />
            <span className="text-white/40">{siteConfig.hero.title[1]}</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/40">
            {siteConfig.hero.subtitle}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <button
                onClick={() => navigate("/interview")}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-white/90"
              >
                Start your interview
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-white/90"
                >
                  <LogIn className="mr-2 size-3.5" />
                  Get started free
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex h-10 items-center rounded-lg border border-white/20 px-5 text-sm text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  <Github className="mr-2 size-3.5" />
                  Sign in with GitHub
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 px-6 py-20 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">Everything you need to prepare</h2>
            <p className="mt-2 text-sm text-white/40">No signup forms, no scheduling — just your GitHub profile and a microphone.</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {siteConfig.features.map((f) => (
              <div
                key={f.title}
                className="bg-[#0A0A0A] p-6"
              >
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-white/10">
                  <f.icon className="size-4 text-white/60" />
                </div>
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/40">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 px-6 py-20 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">How it works</h2>
            <p className="mt-2 text-sm text-white/40">From zero to your first interview in under a minute.</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {siteConfig.steps.map((s, i) => (
              <div key={s.num} className="flex flex-col items-center text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-white/10">
                  <span className="text-xs font-semibold text-white/60">{s.num}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/40">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-white/10 px-6 py-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-8 text-center sm:flex-row sm:gap-16">
          {siteConfig.stats.map((s) => (
            <div key={s.label}>
              <div className="text-xl font-bold text-white sm:text-2xl">{s.value}</div>
              <div className="mt-1 text-sm text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 px-6 py-20 md:py-24">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">FAQ</h2>
            <p className="mt-2 text-sm text-white/40">Everything you need to know about {siteConfig.name}.</p>
          </div>
          <div className="mt-10 space-y-2">
            {siteConfig.faq.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/10 bg-white/[0.02]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-white/70 hover:text-white"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`size-3.5 shrink-0 text-white/20 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openFaq === i ? "max-h-40" : "max-h-0"
                  }`}
                >
                  <div className="border-t border-white/10 px-4 py-3 text-sm leading-relaxed text-white/40">
                    {item.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 px-6 py-20 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-xl font-bold text-white sm:text-2xl">Ready to practice?</h2>
          <p className="mt-2 text-sm text-white/40">Connect GitHub, grant mic access, and start your first interview in under a minute.</p>
          <div className="mt-8">
            {user ? (
              <button
                onClick={() => navigate("/interview")}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-white/90"
              >
                Go to dashboard <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-white/90"
              >
                <Github className="size-3.5" />
                Get started with GitHub
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/20">
        {siteConfig.name} &mdash; {siteConfig.tagline}
      </footer>
    </div>
  );
}
