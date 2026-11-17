"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Database, Tables } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CondominiumScope = {
  client: SupabaseClient<Database> | null;
  condominium: Pick<Tables<"condominiums">, "id" | "name"> | null;
  role: string;
  unitId: string | null;
  userId: string | null;
  loading: boolean;
  error: string;
};

const initialScope: CondominiumScope = {
  client: null,
  condominium: null,
  role: "",
  unitId: null,
  userId: null,
  loading: true,
  error: "",
};

export function useCondominiumScope() {
  const [scope, setScope] = useState(initialScope);

  useEffect(() => {
    let active = true;

    async function loadScope() {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        setScope({
          ...initialScope,
          loading: false,
          error: "Configure as credenciais do Supabase no arquivo .env.local.",
        });
        return;
      }

      const client = createClient();
      const {
        data: { user },
        error: authError,
      } = await client.auth.getUser();

      if (!active) {
        return;
      }
      if (authError) {
        setScope({ ...initialScope, loading: false, error: authError.message });
        return;
      }
      if (!user) {
        window.location.assign("/login");
        return;
      }

      const { data: memberships, error: membershipError } = await client
        .from("condominium_members")
        .select("condominium_id, role, unit_id")
        .eq("user_id", user.id)
        .order("created_at")
        .limit(1);

      if (!active) {
        return;
      }
      if (membershipError) {
        setScope({
          ...initialScope,
          loading: false,
          error: membershipError.message,
        });
        return;
      }

      const membership = memberships?.[0];
      if (!membership) {
        setScope({
          ...initialScope,
          client,
          loading: false,
          userId: user.id,
        });
        return;
      }

      const { data: condominium, error: condominiumError } = await client
        .from("condominiums")
        .select("id, name")
        .eq("id", membership.condominium_id)
        .maybeSingle();

      if (!active) {
        return;
      }
      if (condominiumError) {
        setScope({
          ...initialScope,
          loading: false,
          error: condominiumError.message,
        });
        return;
      }

      setScope({
        client,
        condominium,
        role: membership.role,
        unitId: membership.unit_id,
        userId: user.id,
        loading: false,
        error: "",
      });
    }

    void loadScope();
    return () => {
      active = false;
    };
  }, []);

  return scope;
}
