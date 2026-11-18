"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (siteUrl) {
      const canonicalOrigin = new URL(siteUrl).origin;

      if (window.location.origin !== canonicalOrigin) {
        const canonicalLoginUrl = new URL(
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
          canonicalOrigin
        );

        window.location.replace(canonicalLoginUrl);
        return;
      }
    }

    const urlError = new URLSearchParams(window.location.search).get("error");
    if (urlError) {
      setError(urlError);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setError("Configure as credenciais do Supabase no arquivo .env.local.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const emailRedirectTo = siteUrl
        ? new URL("/auth/callback", siteUrl).toString()
        : `${window.location.origin}/auth/callback`;

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: !isAdminLogin,
          emailRedirectTo,
        },
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setMessage(
        isAdminLogin
          ? "Se este e-mail tiver uma conta de administrador, enviaremos um link de acesso."
          : "Enviamos um link de acesso para o seu e-mail."
      );
    } catch {
      setError("Não foi possível iniciar o acesso. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Condo.ai
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Acessar conta</h1>
        <p className="mt-2 text-sm text-slate-600">
          {isAdminLogin
            ? "Acesso para administradores com conta já existente."
            : "Informe seu e-mail para entrar ou iniciar o cadastro do condomínio."}
        </p>

        <button
          className="mt-5 text-sm font-semibold text-slate-700 underline underline-offset-4"
          onClick={() => {
            setIsAdminLogin((current) => !current);
            setMessage("");
            setError("");
          }}
          type="button"
        >
          {isAdminLogin ? "Voltar ao acesso padrão" : "Entrar como administrador"}
        </button>
        {isAdminLogin && (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Este acesso não cria uma conta nem concede permissões. Seu e-mail
            precisa estar vinculado a um administrador do condomínio.
          </p>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            E-mail
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Enviando..."
              : isAdminLogin
                ? "Enviar link de administrador"
                : "Enviar link seguro"}
          </button>
        </form>

        {message && (
          <p aria-live="polite" className="mt-4 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p aria-live="polite" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
