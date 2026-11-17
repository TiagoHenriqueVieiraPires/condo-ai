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

type Package = Pick<
  Tables<"packages">,
  | "id"
  | "unit_id"
  | "description"
  | "carrier"
  | "status"
  | "received_at"
  | "delivered_at"
>;
type Unit = Pick<Tables<"units">, "id" | "unit_number" | "building_id">;
type Building = Pick<Tables<"buildings">, "id" | "name">;

export default function PackagesPage() {
  const scope = useCondominiumScope();
  const [packages, setPackages] = useState<Package[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const canManagePackages =
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
      const [packageResult, unitResult, buildingResult] = await Promise.all([
        scope.client!
          .from("packages")
          .select("id, unit_id, description, carrier, status, received_at, delivered_at")
          .eq("condominium_id", scope.condominium!.id)
          .order("received_at", { ascending: false }),
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
        packageResult.error ?? unitResult.error ?? buildingResult.error;
      if (queryError) {
        setLoadError(queryError.message);
      } else {
        setPackages(packageResult.data ?? []);
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
    { name: "description", label: "Descrição da encomenda", required: true },
    {
      name: "unit_id",
      label: "Unidade de destino",
      type: "select",
      required: true,
      options: availableUnits.map((unit) => ({
        value: unit.id,
        label: unitLabels.get(unit.id) ?? unit.unit_number,
      })),
    },
    { name: "carrier", label: "Transportadora" },
  ];
  const rows: WorkspaceRow[] = packages.map((item) => ({
    id: item.id,
    description: item.description,
    unit: item.unit_id ? unitLabels.get(item.unit_id) ?? "Unidade" : "—",
    carrier: item.carrier,
    received: item.received_at
      ? new Date(item.received_at).toLocaleString("pt-BR")
      : "—",
    status: item.delivered_at ? "Entregue" : "Aguardando retirada",
  }));

  const createPackage = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium || !canManagePackages) {
        throw new Error("Seu perfil não pode cadastrar encomendas.");
      }
      const { error } = await scope.client.from("packages").insert({
        condominium_id: scope.condominium.id,
        unit_id: values.unit_id,
        description: values.description.trim(),
        carrier: values.carrier.trim() || null,
        status: "received",
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    [canManagePackages, scope.client, scope.condominium],
  );

  async function markDelivered(packageId: string) {
    if (!scope.client) {
      return;
    }
    setActionError("");
    const { error } = await scope.client
      .from("packages")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", packageId);
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
          { key: "description", label: "Encomenda" },
          { key: "unit", label: "Unidade" },
          { key: "carrier", label: "Transportadora" },
          { key: "received", label: "Recebida em" },
          { key: "status", label: "Situação" },
        ]}
        description="Registre encomendas recebidas e confirme quando forem retiradas."
        emptyMessage="Nenhuma encomenda cadastrada."
        externalError={actionError || loadError}
        fields={canManagePackages ? fields : []}
        loading={loading}
        onCreate={canManagePackages ? createPackage : undefined}
        onCreated={() => setRefreshKey((key) => key + 1)}
        renderActions={
          canManagePackages
            ? (row) => {
                const item = packages.find((entry) => entry.id === row.id);
                if (!item || item.delivered_at) {
                  return null;
                }
                return (
                  <button
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => void markDelivered(row.id)}
                    type="button"
                  >
                    Confirmar retirada
                  </button>
                );
              }
            : undefined
        }
        rows={rows}
        title="Encomendas"
      />
    </ScopeGate>
  );
}
