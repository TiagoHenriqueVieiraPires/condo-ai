"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { EntityWorkspace, type WorkspaceRow } from "@/modules/shared/entity-workspace";
import { ScopeGate } from "@/modules/shared/scope-gate";
import { useCondominiumScope } from "@/modules/shared/use-condominium";
import type { Tables } from "@/types/database.types";

type Unit = Pick<
  Tables<"units">,
  "id" | "unit_number" | "building_id" | "floor" | "status"
>;
type Building = Pick<Tables<"buildings">, "id" | "name">;

export default function UnitsPage() {
  const scope = useCondominiumScope();
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
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
      const [unitResult, buildingResult] = await Promise.all([
        scope.client!
          .from("units")
          .select("id, unit_number, building_id, floor, status")
          .eq("condominium_id", scope.condominium!.id)
          .order("unit_number"),
        scope.client!
          .from("buildings")
          .select("id, name")
          .eq("condominium_id", scope.condominium!.id)
          .order("name"),
      ]);

      if (!active) {
        return;
      }
      if (unitResult.error || buildingResult.error) {
        setLoadError(
          unitResult.error?.message ??
            buildingResult.error?.message ??
            "Não foi possível carregar as unidades.",
        );
      } else {
        setUnits(unitResult.data ?? []);
        setBuildings(buildingResult.data ?? []);
      }
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [refreshKey, scope.client, scope.condominium]);

  const buildingNames = useMemo(
    () => new Map(buildings.map((building) => [building.id, building.name])),
    [buildings],
  );
  const rows: WorkspaceRow[] = units.map((unit) => ({
    id: unit.id,
    unit_number: unit.unit_number,
    building: buildingNames.get(unit.building_id) ?? "Bloco",
    floor: unit.floor ?? "—",
    status: unit.status === "occupied" ? "Ocupada" : "Vazia",
  }));
  const fields = useMemo(
    () => [
      {
        name: "building_id",
        label: "Bloco",
        type: "select" as const,
        required: true,
        options: buildings.map((building) => ({
          value: building.id,
          label: building.name,
        })),
      },
      { name: "unit_number", label: "Identificação", required: true },
      { name: "floor", label: "Andar", type: "number" as const, min: 0 },
      {
        name: "status",
        label: "Situação",
        type: "select" as const,
        required: true,
        options: [
          { value: "occupied", label: "Ocupada" },
          { value: "vacant", label: "Vazia" },
        ],
      },
    ],
    [buildings],
  );

  const createUnit = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium || !isManager) {
        throw new Error("Seu perfil não pode cadastrar unidades.");
      }

      const floor = values.floor === "" ? null : Number(values.floor);
      if (floor !== null && (!Number.isInteger(floor) || floor < 0)) {
        throw new Error("Informe um andar válido.");
      }

      const { error } = await scope.client.from("units").insert({
        condominium_id: scope.condominium.id,
        building_id: values.building_id,
        unit_number: values.unit_number.trim(),
        floor,
        status: values.status,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    [isManager, scope.client, scope.condominium],
  );

  async function toggleStatus(unitId: string) {
    if (!scope.client) {
      return;
    }
    const unit = units.find((entry) => entry.id === unitId);
    if (!unit) {
      return;
    }

    setActionError("");
    const nextStatus = unit.status === "occupied" ? "vacant" : "occupied";
    const { error } = await scope.client
      .from("units")
      .update({ status: nextStatus })
      .eq("id", unitId);
    if (error) {
      setActionError(error.message);
      return;
    }
    setRefreshKey((key) => key + 1);
  }

  return (
    <ScopeGate scope={scope}>
      <EntityWorkspace
        columns={[
          { key: "unit_number", label: "Unidade" },
          { key: "building", label: "Bloco" },
          { key: "floor", label: "Andar" },
          { key: "status", label: "Situação" },
        ]}
        description="Cadastre unidades e acompanhe sua ocupação por bloco."
        emptyMessage="Ainda não há unidades neste condomínio."
        externalError={actionError || loadError}
        fields={isManager ? fields : []}
        loading={loading}
        onCreate={isManager ? createUnit : undefined}
        onCreated={() => setRefreshKey((key) => key + 1)}
        renderActions={
          isManager
            ? (row) => {
                const unit = units.find((entry) => entry.id === row.id);
                return (
                  <button
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => void toggleStatus(row.id)}
                    type="button"
                  >
                    {unit?.status === "occupied" ? "Marcar vazia" : "Marcar ocupada"}
                  </button>
                );
              }
            : undefined
        }
        rows={rows}
        title="Unidades"
      />
    </ScopeGate>
  );
}
