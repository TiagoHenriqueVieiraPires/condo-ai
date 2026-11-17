import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const roleLabels: Record<string, string> = {
  administrator: "Administrador",
  syndic: "Síndico",
  council: "Conselho",
  porter: "Porteiro",
  resident: "Morador",
};

function assertNoDatabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  assertNoDatabaseError(authError);
  if (!user) {
    redirect("/login");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("condominium_members")
    .select("condominium_id, role")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1);

  assertNoDatabaseError(membershipError);
  const membership = memberships?.[0];
  if (!membership) {
    redirect("/onboarding");
  }

  const { data: condominium, error: condominiumError } = await supabase
    .from("condominiums")
    .select("id, name")
    .eq("id", membership.condominium_id)
    .single();

  assertNoDatabaseError(condominiumError);
  if (!condominium) {
    throw new Error("Condomínio vinculado ao perfil não encontrado.");
  }

  const isManager =
    membership.role === "administrator" || membership.role === "syndic";
  const stats = isManager
    ? await Promise.all([
        supabase
          .from("residents")
          .select("id", { count: "exact", head: true })
          .eq("condominium_id", condominium.id),
        supabase
          .from("units")
          .select("id", { count: "exact", head: true })
          .eq("condominium_id", condominium.id),
        supabase
          .from("visitors")
          .select("id", { count: "exact", head: true })
          .eq("condominium_id", condominium.id)
          .not("checked_in_at", "is", null)
          .is("checked_out_at", null),
        supabase
          .from("packages")
          .select("id", { count: "exact", head: true })
          .eq("condominium_id", condominium.id)
          .is("delivered_at", null),
        supabase
          .from("maintenance_requests")
          .select("id", { count: "exact", head: true })
          .eq("condominium_id", condominium.id)
          .eq("status", "open"),
        supabase
          .from("bills")
          .select("id", { count: "exact", head: true })
          .eq("condominium_id", condominium.id)
          .eq("paid", false),
      ])
    : [];

  stats.forEach((result) => assertNoDatabaseError(result.error));
  const managerMetrics = isManager
    ? [
        { label: "Moradores", value: stats[0].count ?? 0, href: "/moradores" },
        { label: "Unidades", value: stats[1].count ?? 0, href: "/unidades" },
        { label: "Visitantes no local", value: stats[2].count ?? 0, href: "/visitantes" },
        { label: "Encomendas pendentes", value: stats[3].count ?? 0, href: "/encomendas" },
        { label: "Chamados em aberto", value: stats[4].count ?? 0, href: "/chamados" },
        { label: "Cobranças pendentes", value: stats[5].count ?? 0, href: "/financeiro" },
      ]
    : [];

  const shortcuts = [
    { href: "/visitantes", label: "Registrar visitante", description: "Autorizações e controle de entrada." },
    { href: "/encomendas", label: "Ver encomendas", description: "Acompanhe recebimentos e retiradas." },
    { href: "/chamados", label: "Chamados", description: "Registre ou acompanhe manutenções." },
    { href: "/financeiro", label: "Financeiro", description: "Cobranças e rateios de água e gás." },
    { href: "/comunicados", label: "Comunicados", description: "Avisos importantes do condomínio." },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Painel
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {condominium.name}
        </h1>
        <p className="mt-2 text-slate-600">
          Olá, {user.email}. Seu perfil é {roleLabels[membership.role] ?? membership.role}.
        </p>
      </div>

      {isManager && (
        <section
          aria-label="Indicadores do condomínio"
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {managerMetrics.map((metric) => (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400"
              href={metric.href}
              key={metric.label}
            >
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {metric.value}
              </p>
            </Link>
          ))}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Acesso rápido</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((shortcut) => (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-400"
              href={shortcut.href}
              key={shortcut.href}
            >
              <h3 className="font-semibold text-slate-900">{shortcut.label}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {shortcut.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
