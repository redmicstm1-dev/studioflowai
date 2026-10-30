
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Film, Loader2, Lock, Mail, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/workspace");
    });
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Authentication is not configured. Please check your Supabase environment variables.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setError("Please enter your name.");
          return;
        }

        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: name.trim(),
            },
          },
        });

        if (signupError) throw signupError;

        if (data.session) {
          router.replace("/workspace");
          router.refresh();
        } else {
          setMessage("Your account has been created. Check your email for a confirmation link before signing in.");
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
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
        <Link
          href="/"
          className="mb-10 flex items-center justify-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/30">
            <Film size={23} />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            Studio<span className="text-violet-400">Flow</span>
          </span>
        </Link>

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
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setMessage("");
              }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setMessage("");
              }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Your name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {mode === "login" ? "Sign in to StudioFlow" : "Create my account"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-xs leading-6 text-slate-500">
            By continuing, you agree to use StudioFlow responsibly and keep
            your account credentials secure.
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
