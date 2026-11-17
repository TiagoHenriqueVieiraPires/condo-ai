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

type Resident = Pick<
  Tables<"residents">,
  | "id"
  | "full_name"
  | "email"
  | "phone"
  | "document_number"
  | "unit_id"
  | "is_owner"
  | "status"
>;
type Unit = Pick<Tables<"units">, "id" | "unit_number" | "building_id">;
type Building = Pick<Tables<"buildings">, "id" | "name">;
type Vehicle = Pick<
  Tables<"vehicles">,
  "id" | "resident_id" | "plate" | "model" | "color"
>;

export default function ResidentsPage() {
  const scope = useCondominiumScope();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
      const [residentResult, unitResult, buildingResult, vehicleResult] =
        await Promise.all([
          scope.client!
            .from("residents")
            .select(
              "id, full_name, email, phone, document_number, unit_id, is_owner, status",
            )
            .eq("condominium_id", scope.condominium!.id)
            .order("full_name"),
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
          scope.client!
            .from("vehicles")
            .select("id, resident_id, plate, model, color")
            .eq("condominium_id", scope.condominium!.id)
            .order("plate"),
        ]);

      if (!active) {
        return;
      }
      const queryError =
        residentResult.error ??
        unitResult.error ??
        buildingResult.error ??
        vehicleResult.error;
      if (queryError) {
        setLoadError(queryError.message);
      } else {
        setResidents(residentResult.data ?? []);
        setUnits(unitResult.data ?? []);
        setBuildings(buildingResult.data ?? []);
        setVehicles(vehicleResult.data ?? []);
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
  const residentNames = useMemo(
    () => new Map(residents.map((resident) => [resident.id, resident.full_name])),
    [residents],
  );
  const residentRows: WorkspaceRow[] = residents.map((resident) => ({
    id: resident.id,
    name: resident.full_name,
    unit: resident.unit_id ? unitLabels.get(resident.unit_id) ?? "Unidade" : "Sem unidade",
    email: resident.email,
    phone: resident.phone,
    type: resident.is_owner ? "Proprietário" : "Morador",
    status: resident.status === "inactive" ? "Inativo" : "Ativo",
  }));
  const vehicleRows: WorkspaceRow[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    resident: residentNames.get(vehicle.resident_id) ?? "Morador",
    plate: vehicle.plate,
    model: vehicle.model,
    color: vehicle.color,
  }));
  const residentFields: WorkspaceField[] = [
    { name: "full_name", label: "Nome completo", required: true },
    { name: "email", label: "E-mail", type: "email" },
    { name: "phone", label: "Telefone", type: "tel" },
    { name: "document_number", label: "CPF ou documento" },
    {
      name: "unit_id",
      label: "Unidade",
      type: "select",
      options: units.map((unit) => ({
        value: unit.id,
        label: unitLabels.get(unit.id) ?? unit.unit_number,
      })),
    },
    {
      name: "is_owner",
      label: "Vínculo",
      type: "select",
      required: true,
      options: [
        { value: "true", label: "Proprietário" },
        { value: "false", label: "Morador" },
      ],
    },
  ];
  const vehicleFields: WorkspaceField[] = [
    {
      name: "resident_id",
      label: "Morador",
      type: "select",
      required: true,
      options: residents.map((resident) => ({
        value: resident.id,
        label: `${resident.full_name}${resident.unit_id ? ` · ${unitLabels.get(resident.unit_id) ?? ""}` : ""}`,
      })),
    },
    { name: "plate", label: "Placa", required: true },
    { name: "model", label: "Modelo" },
    { name: "color", label: "Cor" },
  ];

  const createResident = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium || !isManager) {
        throw new Error("Seu perfil não pode cadastrar moradores.");
      }
      const { error } = await scope.client.from("residents").insert({
        condominium_id: scope.condominium.id,
        full_name: values.full_name.trim(),
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        document_number: values.document_number.trim() || null,
        unit_id: values.unit_id || null,
        is_owner: values.is_owner === "true",
        status: "active",
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    [isManager, scope.client, scope.condominium],
  );

  const createVehicle = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium || !isManager) {
        throw new Error("Seu perfil não pode cadastrar veículos.");
      }
      const { error } = await scope.client.from("vehicles").insert({
        condominium_id: scope.condominium.id,
        resident_id: values.resident_id,
        plate: values.plate.trim().toUpperCase(),
        model: values.model.trim() || null,
        color: values.color.trim() || null,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    [isManager, scope.client, scope.condominium],
  );

  async function toggleResidentStatus(residentId: string) {
    if (!scope.client) {
      return;
    }
    const resident = residents.find((entry) => entry.id === residentId);
    if (!resident) {
      return;
    }
    setActionError("");
    const { error } = await scope.client
      .from("residents")
      .update({ status: resident.status === "inactive" ? "active" : "inactive" })
      .eq("id", residentId);
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
            { key: "name", label: "Nome" },
            { key: "unit", label: "Unidade" },
            { key: "type", label: "Vínculo" },
            { key: "email", label: "E-mail" },
            { key: "phone", label: "Telefone" },
            { key: "status", label: "Situação" },
          ]}
          description="Mantenha os dados de moradores, vínculos e veículos atualizados."
          externalError={actionError || loadError}
          fields={isManager ? residentFields : []}
          loading={loading}
          onCreate={isManager ? createResident : undefined}
          onCreated={() => setRefreshKey((key) => key + 1)}
          renderActions={
            isManager
              ? (row) => {
                  const resident = residents.find((entry) => entry.id === row.id);
                  return (
                    <button
                      className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => void toggleResidentStatus(row.id)}
                      type="button"
                    >
                      {resident?.status === "inactive" ? "Reativar" : "Inativar"}
                    </button>
                  );
                }
              : undefined
          }
          rows={residentRows}
          title="Moradores"
        />
        {isManager && (
          <EntityWorkspace
            columns={[
              { key: "resident", label: "Morador" },
              { key: "plate", label: "Placa" },
              { key: "model", label: "Modelo" },
              { key: "color", label: "Cor" },
            ]}
            createLabel="Adicionar veículo"
            description="Associe os veículos cadastrados às unidades e moradores."
            emptyMessage="Nenhum veículo cadastrado."
            fields={vehicleFields}
            loading={loading}
            onCreate={createVehicle}
            onCreated={() => setRefreshKey((key) => key + 1)}
            rows={vehicleRows}
            title="Veículos"
          />
        )}
      </div>
    </ScopeGate>
  );
}
