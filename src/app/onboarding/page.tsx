"use client";

import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const [condominiumName, setCondominiumName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [buildingName, setBuildingName] = useState("Bloco A");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.rpc("create_condominium_with_admin", {
      target_condominium_name: condominiumName.trim(),
      target_admin_name: adminName.trim(),
      target_building_name: buildingName.trim(),
    });

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Condo.ai
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Configure seu condomínio
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Criaremos o condomínio, o primeiro bloco e seu acesso de administrador
          juntos, sem expor credenciais administrativas.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Nome do condomínio
            <input
              autoComplete="organization"
              className="rounded-lg border border-slate-300 px-3 py-2.5"
              maxLength={120}
              minLength={2}
              onChange={(event) => setCondominiumName(event.target.value)}
              required
              value={condominiumName}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Seu nome
            <input
              autoComplete="name"
              className="rounded-lg border border-slate-300 px-3 py-2.5"
              maxLength={120}
              minLength={2}
              onChange={(event) => setAdminName(event.target.value)}
              required
              value={adminName}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Primeiro bloco
            <input
              className="rounded-lg border border-slate-300 px-3 py-2.5"
              maxLength={120}
              minLength={1}
              onChange={(event) => setBuildingName(event.target.value)}
              required
              value={buildingName}
            />
          </label>

          {errorMessage && (
            <p aria-live="polite" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Criando..." : "Criar condomínio"}
          </button>
        </form>
      </section>
    </main>
  );
}
