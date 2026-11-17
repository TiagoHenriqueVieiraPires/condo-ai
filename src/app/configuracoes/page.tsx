"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityWorkspace,
  type WorkspaceField,
  type WorkspaceRow,
} from "@/modules/shared/entity-workspace";
import { ScopeGate } from "@/modules/shared/scope-gate";
import { useCondominiumScope } from "@/modules/shared/use-condominium";
import type { Tables } from "@/types/database.types";

type Building = Pick<Tables<"buildings">, "id" | "name" | "description">;
type Unit = Pick<Tables<"units">, "id" | "unit_number" | "building_id">;
type Member = Pick<
  Tables<"condominium_members">,
  "id" | "user_id" | "role" | "unit_id" | "created_at"
>;
type Profile = Pick<Tables<"user_profiles">, "id" | "email" | "full_name">;

const roleLabels: Record<string, string> = {
  administrator: "Administrador",
  syndic: "Síndico",
  council: "Conselho",
  porter: "Porteiro",
  resident: "Morador",
};

export default function SettingsPage() {
  const scope = useCondominiumScope();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const isManager = scope.role === "administrator" || scope.role === "syndic";

  useEffect(() => {
    if (!scope.client || !scope.condominium) {
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setLoadError("");
      const [buildingResult, unitResult, memberResult] = await Promise.all([
        scope.client!
          .from("buildings")
          .select("id, name, description")
          .eq("condominium_id", scope.condominium!.id)
          .order("name"),
        scope.client!
          .from("units")
          .select("id, unit_number, building_id")
          .eq("condominium_id", scope.condominium!.id)
          .order("unit_number"),
        scope.client!
          .from("condominium_members")
          .select("id, user_id, role, unit_id, created_at")
          .eq("condominium_id", scope.condominium!.id)
          .order("created_at"),
      ]);

      if (!active) {
        return;
      }
      const queryError =
        buildingResult.error ?? unitResult.error ?? memberResult.error;
      if (queryError) {
        setLoadError(queryError.message);
        setLoading(false);
        return;
      }

      const loadedMembers = memberResult.data ?? [];
      const profileIds = [...new Set(loadedMembers.map((member) => member.user_id))];
      let loadedProfiles: Profile[] = [];
      if (profileIds.length > 0) {
        const { data: profileData, error: profileError } = await scope.client!
          .from("user_profiles")
          .select("id, email, full_name")
          .in("id", profileIds);
        if (profileError) {
          setLoadError(profileError.message);
          setLoading(false);
          return;
        }
        loadedProfiles = profileData ?? [];
      }

      if (!active) {
        return;
      }
      setBuildings(buildingResult.data ?? []);
      setUnits(unitResult.data ?? []);
      setMembers(loadedMembers);
      setProfiles(loadedProfiles);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [refreshKey, scope.client, scope.condominium]);

  const buildingRows: WorkspaceRow[] = buildings.map((building) => ({
    id: building.id,
    name: building.name,
    description: building.description,
  }));
  const buildingFields: WorkspaceField[] = [
    { name: "name", label: "Nome do bloco", required: true },
    { name: "description", label: "Descrição" },
  ];
  const unitLabels = useMemo(() => {
    const buildingNames = new Map(
      buildings.map((building) => [building.id, building.name]),
    );
    return new Map(
      units.map((unit) => [
        unit.id,
        `${buildingNames.get(unit.building_id) ?? "Bloco"} · ${unit.unit_number}`,
      ]),
    );
  }, [buildings, units]);
  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const memberRows: WorkspaceRow[] = members.map((member) => {
    const profile = profileById.get(member.user_id);
    return {
      id: member.id,
      user_id: member.user_id,
      email: profile?.email ?? member.user_id,
      name: profile?.full_name ?? "—",
      role: roleLabels[member.role] ?? member.role,
      unit: member.unit_id ? unitLabels.get(member.unit_id) ?? "Unidade" : "—",
      added: member.created_at
        ? new Date(member.created_at).toLocaleDateString("pt-BR")
        : "—",
    };
  });
  const roleOptions = [
    ...(scope.role === "administrator"
      ? [{ value: "administrator", label: "Administrador" }]
      : []),
    { value: "syndic", label: "Síndico" },
    { value: "council", label: "Conselho" },
    { value: "porter", label: "Porteiro" },
    { value: "resident", label: "Morador" },
  ];
  const memberFields: WorkspaceField[] = [
    { name: "email", label: "E-mail cadastrado", type: "email", required: true },
    {
      name: "role",
      label: "Perfil",
      type: "select",
      required: true,
      options: roleOptions,
    },
    {
      name: "unit_id",
      label: "Unidade (obrigatória para morador)",
      type: "select",
      options: units.map((unit) => ({
        value: unit.id,
        label: unitLabels.get(unit.id) ?? unit.unit_number,
      })),
    },
  ];

  const createBuilding = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium || !isManager) {
        throw new Error("Seu perfil não pode cadastrar blocos.");
      }
      const { error } = await scope.client.from("buildings").insert({
        condominium_id: scope.condominium.id,
        name: values.name.trim(),
        description: values.description.trim() || null,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    [isManager, scope.client, scope.condominium],
  );

  const addMember = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium || !isManager) {
        throw new Error("Seu perfil não pode gerenciar acessos.");
      }
      if (values.role === "resident" && !values.unit_id) {
        throw new Error("Selecione a unidade do morador.");
      }

      const { error } = await scope.client.rpc(
        "add_condominium_member_by_email",
        {
          target_condominium_id: scope.condominium.id,
          target_email: values.email.trim(),
          target_role: values.role,
          target_unit_id: values.unit_id || undefined,
        },
      );
      if (error) {
        throw new Error(error.message);
      }
    },
    [isManager, scope.client, scope.condominium],
  );

  async function removeMember(memberId: string) {
    if (!scope.client) {
      return;
    }
    const member = members.find((entry) => entry.id === memberId);
    if (!member || member.user_id === scope.userId) {
      setActionError("Não é permitido remover o próprio acesso.");
      return;
    }
    if (
      member.role === "administrator" &&
      scope.role !== "administrator"
    ) {
      setActionError("Somente um administrador pode remover outro administrador.");
      return;
    }
    if (!window.confirm("Remover o acesso deste usuário ao condomínio?")) {
      return;
    }

    setActionError("");
    const { error } = await scope.client
      .from("condominium_members")
      .delete()
      .eq("id", memberId);
    if (error) {
      setActionError(error.message);
      return;
    }
    setRefreshKey((key) => key + 1);
  }

  return (
    <ScopeGate scope={scope}>
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <EntityWorkspace
          columns={[
            { key: "name", label: "Bloco" },
            { key: "description", label: "Descrição" },
          ]}
          description="Cadastre e organize os blocos do condomínio."
          emptyMessage="Nenhum bloco cadastrado."
          externalError={actionError || loadError}
          fields={isManager ? buildingFields : []}
          loading={loading}
          onCreate={isManager ? createBuilding : undefined}
          onCreated={() => setRefreshKey((key) => key + 1)}
          rows={buildingRows}
          title="Blocos"
        />
        <EntityWorkspace
          columns={[
            { key: "name", label: "Nome" },
            { key: "email", label: "E-mail" },
            { key: "role", label: "Perfil" },
            { key: "unit", label: "Unidade" },
            { key: "added", label: "Vinculado em" },
          ]}
          createLabel="Vincular usuário"
          description="O usuário precisa primeiro criar uma conta com o mesmo e-mail. Atribua somente o perfil necessário."
          emptyMessage="Nenhum usuário vinculado."
          externalError={actionError || loadError}
          fields={isManager ? memberFields : []}
          loading={loading}
          onCreate={isManager ? addMember : undefined}
          onCreated={() => setRefreshKey((key) => key + 1)}
          renderActions={
            isManager
              ? (row) =>
                  row.user_id !== scope.userId ? (
                    <button
                      className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      onClick={() => void removeMember(row.id)}
                      type="button"
                    >
                      Remover
                    </button>
                  ) : null
              : undefined
          }
          rows={memberRows}
          title="Acessos"
        />
      </div>
    </ScopeGate>
  );
}
