"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/server/better-auth/client";

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await signIn.email({ email: form.email, password: form.password });
    setLoading(false);
    if (error) { setError("Invalid email or password"); return; }
    router.push("/chat");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-teal-50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500 text-xl">💬</div>
            <span className="text-xl font-black text-gray-900">Chat<span className="text-green-500">App</span></span>
          </Link>
          <p className="mt-1 text-sm text-gray-400">Welcome back</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: "email",    type: "email",    label: "Email",    placeholder: "you@example.com" },
            { id: "password", type: "password", label: "Password", placeholder: "Your password"   },
          ].map(f => (
            <div key={f.id}>
              <label htmlFor={f.id} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                {f.label}
              </label>
              <input id={f.id} type={f.type}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder-gray-400 focus:border-green-400 focus:bg-white focus:outline-none"
                placeholder={f.placeholder}
                value={(form as any)[f.id]}
                onChange={e => setForm(p => ({ ...p, [f.id]: e.target.value }))}
                required
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-400 disabled:opacity-50">
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          No account?{" "}
          <Link href="/sign-up" className="font-semibold text-green-500 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}

