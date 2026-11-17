"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Membership = Pick<Tables<"condominium_members">, "condominium_id" | "role">;
type Condominium = Pick<Tables<"condominiums">, "id" | "name">;

const navigation = [
  { href: "/dashboard", label: "Painel", roles: ["administrator", "syndic", "council", "porter", "resident"] },
  { href: "/unidades", label: "Unidades", roles: ["administrator", "syndic"] },
  { href: "/moradores", label: "Moradores", roles: ["administrator", "syndic"] },
  { href: "/visitantes", label: "Visitantes", roles: ["administrator", "syndic", "porter", "resident"] },
  { href: "/encomendas", label: "Encomendas", roles: ["administrator", "syndic", "porter", "resident"] },
  { href: "/chamados", label: "Manutenção", roles: ["administrator", "syndic", "resident"] },
  { href: "/financeiro", label: "Financeiro", roles: ["administrator", "syndic", "council", "resident"] },
  { href: "/comunicados", label: "Comunicados", roles: ["administrator", "syndic", "council", "resident"] },
  { href: "/configuracoes", label: "Configurações", roles: ["administrator", "syndic"] },
] as const;

const roleLabels: Record<string, string> = {
  administrator: "Administrador",
  syndic: "Síndico",
  council: "Conselho",
  porter: "Porteiro",
  resident: "Morador",
};

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("");
  const [membership, setMembership] = useState<Membership | null>(null);
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [shellError, setShellError] = useState("");
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/auth/");

  useEffect(() => {
    if (isPublicRoute) {
      return;
    }

    let active = true;

    async function loadIdentity() {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }
      if (authError) {
        setShellError(authError.message);
        return;
      }
      if (!user) {
        return;
      }

      setUserEmail(user.email ?? "");
      const { data: membershipData, error: membershipError } = await supabase
        .from("condominium_members")
        .select("condominium_id, role")
        .eq("user_id", user.id)
        .order("created_at")
        .limit(1);

      if (!active) {
        return;
      }
      if (membershipError) {
        setShellError(membershipError.message);
        return;
      }

      const currentMembership = membershipData?.[0] ?? null;
      setMembership(currentMembership);
      if (!currentMembership) {
        return;
      }

      const { data: condominiumData, error: condominiumError } = await supabase
        .from("condominiums")
        .select("id, name")
        .eq("id", currentMembership.condominium_id)
        .maybeSingle();

      if (!active) {
        return;
      }
      if (condominiumError) {
        setShellError(condominiumError.message);
        return;
      }
      setCondominium(condominiumData);
    }

    void loadIdentity();
    return () => {
      active = false;
    };
  }, [isPublicRoute]);

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setShellError(error.message);
      return;
    }
    window.location.assign("/login");
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const role = membership?.role ?? "";
  const visibleNavigation = navigation.filter((item) =>
    item.roles.some((allowedRole) => allowedRole === role),
  );

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <Link
              className="text-lg font-bold tracking-tight text-slate-900"
              href="/dashboard"
            >
              Condo.ai
            </Link>
            {condominium && (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {condominium.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {role && (
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-slate-600 sm:inline">
                {roleLabels[role] ?? role}
              </span>
            )}
            {userEmail && (
              <span className="hidden max-w-56 truncate text-slate-500 md:inline">
                {userEmail}
              </span>
            )}
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => void signOut()}
              type="button"
            >
              Sair
            </button>
          </div>
        </div>
        {visibleNavigation.length > 0 && (
          <nav
            aria-label="Navegação principal"
            className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 pb-3"
          >
            {visibleNavigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      {shellError && (
        <p
          aria-live="polite"
          className="mx-auto mt-4 max-w-7xl px-6 text-sm text-red-700"
          role="alert"
        >
          {shellError}
        </p>
      )}
      {children}
    </>
  );
}
