"use client";

import Link from "next/link";

import type { CondominiumScope } from "@/modules/shared/use-condominium";

export function ScopeGate({
  scope,
  children,
}: {
  scope: CondominiumScope;
  children: React.ReactNode;
}) {
  if (scope.loading) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 text-sm text-slate-600">
        Carregando condomínio...
      </main>
    );
  }

  if (scope.error) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {scope.error}
        </p>
      </main>
    );
  }

  if (!scope.condominium) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
        <section className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="font-semibold text-slate-900">
            Nenhum condomínio vinculado
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure um condomínio ou peça ao administrador para vincular seu
            usuário.
          </p>
          <Link
            className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            href="/onboarding"
          >
            Configurar condomínio
          </Link>
        </section>
      </main>
    );
  }

  return children;
}
