"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { supabase } from "@/lib/supabase";
import Logo from "@/components/shared/Logo";
import Button from "@/components/ui/Button";
import Inputs from "@/components/ui/Inputs";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        router.replace("/workspace");
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Authentication is not configured. Check your Supabase environment variables.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
          },
        });

        if (signupError) throw signupError;

        if (data.session) {
          router.replace("/workspace");
          router.refresh();
        } else {
          setMessage(
            "Your account has been created. Check your email for a confirmation link before signing in."
          );
        }
      } else {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (loginError) throw loginError;

        router.replace("/workspace");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b16] px-5 py-12 text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-700/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-700/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Logo size="lg" />
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
              Your creative workspace
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {mode === "login"
                ? "Sign in to continue building your creative projects."
                : "Join StudioFlow and bring your creative projects together."}
            </p>
          </div>

          <div className="mb-7 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
            {(["login", "signup"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab);
                  setError("");
                  setMessage("");
                }}
                className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                  mode === tab
                    ? "bg-violet-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <Inputs
                label="Your name"
                placeholder="Enter your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                leftIcon={<User size={18} />}
              />
            )}

            <Inputs
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              leftIcon={<Mail size={18} />}
            />

            <Inputs
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={6}
              required
              leftIcon={<Lock size={18} />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-slate-500 transition hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-300"
              >
                {message}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading}>
              {mode === "login"
                ? "Sign in to StudioFlow"
                : "Create my account"}
              {!loading && <ArrowRight size={18} />}
            </Button>
          </form>

          <p className="mt-7 text-center text-xs leading-6 text-slate-500">
            Keep your account credentials secure. By continuing, you agree to
            use StudioFlow responsibly.
          </p>
        </section>

        <p className="mt-7 text-center text-sm text-slate-500">
          <Link href="/" className="transition hover:text-violet-400">
            ← Back to StudioFlow
          </Link>
        </p>
      </div>
    </main>
  );
}