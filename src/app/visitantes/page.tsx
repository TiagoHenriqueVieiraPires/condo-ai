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

type Visitor = Pick<
  Tables<"visitors">,
  | "id"
  | "full_name"
  | "unit_id"
  | "document_number"
  | "vehicle_plate"
  | "status"
  | "checked_in_at"
  | "checked_out_at"
  | "created_at"
>;
type Unit = Pick<Tables<"units">, "id" | "unit_number" | "building_id">;
type Building = Pick<Tables<"buildings">, "id" | "name">;

export default function VisitorsPage() {
  const scope = useCondominiumScope();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const canManageEntry =
    scope.role === "administrator" ||
    scope.role === "syndic" ||
    scope.role === "porter";

  useEffect(() => {
    if (!scope.client || !scope.condominium) {
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setLoadError("");
      const [visitorResult, unitResult, buildingResult] = await Promise.all([
        scope.client!
          .from("visitors")
          .select(
            "id, full_name, unit_id, document_number, vehicle_plate, status, checked_in_at, checked_out_at, created_at",
          )
          .eq("condominium_id", scope.condominium!.id)
          .order("created_at", { ascending: false }),
        scope.client!
          .from("units")
          .select("id, unit_number, building_id")
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
      const queryError =
        visitorResult.error ?? unitResult.error ?? buildingResult.error;
      if (queryError) {
        setLoadError(queryError.message);
      } else {
        setVisitors(visitorResult.data ?? []);
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
  const unitLabels = useMemo(
    () =>
      new Map(
        units.map((unit) => [
          unit.id,
          `${buildingNames.get(unit.building_id) ?? "Bloco"} · ${unit.unit_number}`,
        ]),
      ),
    [buildingNames, units],
  );
  const availableUnits =
    scope.role === "resident"
      ? units.filter((unit) => unit.id === scope.unitId)
      : units;
  const fields: WorkspaceField[] = [
    { name: "full_name", label: "Nome do visitante", required: true },
    {
      name: "unit_id",
      label: "Unidade visitada",
      type: "select",
      required: true,
      options: availableUnits.map((unit) => ({
        value: unit.id,
        label: unitLabels.get(unit.id) ?? unit.unit_number,
      })),
    },
    { name: "document_number", label: "Documento" },
    { name: "vehicle_plate", label: "Placa do veículo" },
  ];
  const rows: WorkspaceRow[] = visitors.map((visitor) => ({
    id: visitor.id,
    visitor: visitor.full_name,
    unit: visitor.unit_id ? unitLabels.get(visitor.unit_id) ?? "Unidade" : "—",
    document: visitor.document_number,
    vehicle: visitor.vehicle_plate,
    status: visitor.checked_out_at
      ? "Saiu"
      : visitor.checked_in_at
        ? "No condomínio"
        : "Aguardando entrada",
    registered: visitor.created_at
      ? new Date(visitor.created_at).toLocaleString("pt-BR")
      : "—",
  }));

  const createVisitor = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium) {
        throw new Error("Condomínio não encontrado.");
      }
      const { error } = await scope.client.from("visitors").insert({
        condominium_id: scope.condominium.id,
        unit_id: values.unit_id,
        full_name: values.full_name.trim(),
        document_number: values.document_number.trim() || null,
        vehicle_plate: values.vehicle_plate.trim().toUpperCase() || null,
        status: "expected",
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    [scope.client, scope.condominium],
  );

  async function updateEntry(visitorId: string, checkedIn: boolean) {
    if (!scope.client) {
      return;
    }
    setActionError("");
    const now = new Date().toISOString();
    const { error } = await scope.client
      .from("visitors")
      .update(
        checkedIn
          ? { checked_in_at: now, status: "checked_in" }
          : { checked_out_at: now, status: "checked_out" },
      )
      .eq("id", visitorId);
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
          { key: "visitor", label: "Visitante" },
          { key: "unit", label: "Unidade" },
          { key: "document", label: "Documento" },
          { key: "vehicle", label: "Veículo" },
          { key: "status", label: "Situação" },
          { key: "registered", label: "Cadastro" },
        ]}
        description="Registre visitantes e acompanhe entradas e saídas."
        emptyMessage="Nenhum visitante registrado."
        externalError={actionError || loadError}
        fields={fields}
        loading={loading}
        onCreate={createVisitor}
        onCreated={() => setRefreshKey((key) => key + 1)}
        renderActions={
          canManageEntry
            ? (row) => {
                const visitor = visitors.find((entry) => entry.id === row.id);
                if (!visitor || visitor.checked_out_at) {
                  return null;
                }
                return (
                  <button
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      void updateEntry(row.id, !visitor.checked_in_at)
                    }
                    type="button"
                  >
                    {visitor.checked_in_at ? "Registrar saída" : "Registrar entrada"}
                  </button>
                );
              }
            : undefined
        }
        rows={rows}
        title="Visitantes"
      />
    </ScopeGate>
  );
}
