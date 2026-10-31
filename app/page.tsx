import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Boxes,
  Check,
  Clapperboard,
  Film,
  Sparkles,
  WandSparkles,
  BookOpen,
  Layers3,
  Workflow,
} from "lucide-react";

const features = [
  {
    number: "01",
    title: "Story Studio",
    description:
      "Develop ideas, write scripts, shape characters, and keep the heart of your story in one organized place.",
    icon: BookOpen,
    color: "text-orange-300",
    background: "bg-orange-400/10",
  },
  {
    number: "02",
    title: "Shot Studio",
    description:
      "Break scenes into shots, plan framing and camera movement, and build a clearer path from script to your screen.",
    icon: Clapperboard,
    color: "text-violet-300",
    background: "bg-violet-400/10",
  },
  {
    number: "03",
    title: "Voice Studio",
    description:
      "Plan character voices, prepare dialogue, and build toward consent-aware voice production workflows.",
    icon: AudioLines,
    color: "text-emerald-300",
    background: "bg-emerald-400/10",
  },
  {
    number: "04",
    title: "Asset Library",
    description:
      "Keep visual references, production assets, and important creative details organized around your projects.",
    icon: Boxes,
    color: "text-amber-200",
    background: "bg-amber-300/10",
  },
];

const steps = [
  {
    number: "01",
    title: "Start with an idea",
    description:
      "Give your concept a home, whether it is a short film, a series, or a story still taking shape.",
  },
  {
    number: "02",
    title: "Build the pieces",
    description:
      "Develop scripts, characters, scenes, shots, voices, and references around the same creative project.",
  },
  {
    number: "03",
    title: "Bring it together",
    description:
      "Keep production details connected and make your next creative decision with greater clarity.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-50 border-b border-[#2b2a27] bg-[#111110]/90 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 md:px-8"
        >
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f08a4b] text-[#23150e]">
              <WandSparkles size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">
                StudioFlow<span className="accent">.</span>
              </span>
              <span className="block text-[9px] tracking-[0.17em] text-[#918c82]">
                YOUR CREATIVE WORKSHOP
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-[#b4afa5] md:flex">
            <a className="transition hover:text-white" href="#features">
              Creative tools
            </a>
            <a className="transition hover:text-white" href="#workflow">
              How it works
            </a>
            <a className="transition hover:text-white" href="#about">
              About
            </a>
          </div>

          <Link href="/login" className="action-button inline-flex items-center gap-2 text-sm">
            Open workspace
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(240,138,75,0.13),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:py-32">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#54402f] bg-[#211a15] px-3.5 py-2 text-xs text-[#e7b18d]">
              <Sparkles size={14} aria-hidden="true" />
              A workspace for ideas in motion
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-5xl lg:text-7xl">
              Your ideas deserve more than{" "}
              <span className="accent">a dozen open tabs.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[#aaa59b] md:text-lg">
              StudioFlow brings creative development and production planning
              into one workspace. Shape stories, plan scenes and shots, organize
              assets, and keep the details connected as your ideas grow.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="action-button inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold"
              >
                Start creating
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3b3934] px-6 py-3.5 text-sm font-medium text-[#e4dfd5] transition hover:border-[#6a5544] hover:bg-white/[0.03]"
              >
                Explore the tools
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#8f8a81]">
              <span className="flex items-center gap-2">
                <Check size={14} className="text-[#83c9ad]" /> Story development
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} className="text-[#83c9ad]" /> Production planning
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} className="text-[#83c9ad]" /> Creative organization
              </span>
            </div>
          </div>

          <div
            aria-label="Illustration of the StudioFlow creative workspace"
            className="relative mx-auto w-full max-w-xl"
          >
            <div className="absolute -inset-8 rounded-full bg-[#f08a4b]/10 blur-3xl" />
            <div className="panel relative rotate-[1deg] p-3 shadow-2xl shadow-black/40 sm:p-5">
              <div className="panel p-5 sm:p-6">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#88847a]">YOUR WORKSPACE</p>
                    <h2 className="mt-1 text-lg font-semibold">The creative process</h2>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f08a4b]/15 accent">
                    <Layers3 size={21} aria-hidden="true" />
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="panel p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f08a4b]/15 accent">
                        <BookOpen size={20} aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Story & script</p>
                        <p className="mt-1 text-xs text-[#a19a8e]">Ideas, characters, story structure</p>
                      </div>
                      <span className="text-xs accent">01</span>
                    </div>
                  </div>

                  <div className="ml-5 h-5 border-l border-dashed border-[#5b4a3b]" />

                  <div className="panel p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                        <Film size={20} aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Scenes & shots</p>
                        <p className="mt-1 text-xs text-[#a19aaf]">Framing, action, visual direction</p>
                      </div>
                      <span className="text-xs text-violet-300">02</span>
                    </div>
                  </div>

                  <div className="ml-5 h-5 border-l border-dashed border-[#5b4a3b]" />

                  <div className="panel p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                        <Workflow size={20} aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Connected production</p>
                        <p className="mt-1 text-xs text-[#9eaaa1]">Continuity, references, voice planning</p>
                      </div>
                      <span className="text-xs text-emerald-300">03</span>
                    </div>
                  </div>
                </div>

                <p className="mt-6 border-t border-[#2b2a27] pt-4 text-xs leading-5 text-[#88847a]">
                  One creative project. A clearer view of the pieces that bring it to life.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="scroll-mt-24 border-y border-[#2b2a27] bg-[#151513]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="max-w-2xl">
            <p className="mini-label mb-3">YOUR CREATIVE TOOLKIT</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Every part of the process has a place.
            </h2>
            <p className="mt-4 leading-7 text-[#aaa59b]">
              Creative work involves more than one document. StudioFlow is designed to help connect the story, the production plan, the voices, and the assets that support your vision.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.number}
                  className="panel group p-6 transition duration-200 hover:-translate-y-1 hover:border-[#62503f]"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.background} ${feature.color}`}>
                      <Icon size={23} aria-hidden="true" />
                    </span>
                    <span className="text-xs tracking-widest text-[#77736b]">{feature.number}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#a09b91]">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mini-label mb-3">FROM SPARK TO SCREEN</p>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                A little more clarity at every step.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-[#aaa59b]">
                Start with the idea you have today. Organize the pieces as your vision becomes clearer. Keep the creative decisions connected instead of scattered across separate tools.
              </p>
              <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold accent transition hover:opacity-80">
                Explore your workspace <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-3">
              {steps.map((step) => (
                <article key={step.number} className="panel flex gap-5 p-5 sm:p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4b3b2e] text-sm font-semibold accent">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#a09b91]">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="scroll-mt-24 border-t border-[#2b2a27] bg-[#151513]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="max-w-3xl">
            <p className="mini-label mb-3">ABOUT STUDIOFLOW</p>

            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              A connected home for creative production.
            </h2>

            <p className="mt-5 text-base leading-8 text-[#aaa59b]">
              StudioFlow is designed to bring the many moving parts of creative
              production into one organized workspace. From early story development
              to scene planning, character voices, and production assets, it helps
              creators keep their ideas and decisions connected as projects evolve.
            </p>

            <Link
              href="/login"
              className="action-button mt-8 inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold"
            >
              Get started
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2b2a27]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-xs text-[#88847a] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <Link href="/" className="font-semibold text-[#d9d2c6]">
            StudioFlow<span className="accent">.</span>
          </Link>
          <p>A creative production workspace for stories, scenes, voices, and ideas.</p>
          <Link href="/login" className="transition hover:text-white">
            Open workspace <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}