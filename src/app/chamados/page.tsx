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

type Request = Pick<
  Tables<"maintenance_requests">,
  | "id"
  | "resident_id"
  | "title"
  | "description"
  | "category"
  | "priority"
  | "status"
  | "created_at"
>;
type Resident = Pick<Tables<"residents">, "id" | "full_name" | "unit_id">;
type Unit = Pick<Tables<"units">, "id" | "unit_number" | "building_id">;
type Building = Pick<Tables<"buildings">, "id" | "name">;

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function MaintenancePage() {
  const scope = useCondominiumScope();
  const [requests, setRequests] = useState<Request[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
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
      const [requestResult, residentResult, unitResult, buildingResult] =
        await Promise.all([
          scope.client!
            .from("maintenance_requests")
            .select(
              "id, resident_id, title, description, category, priority, status, created_at",
            )
            .eq("condominium_id", scope.condominium!.id)
            .order("created_at", { ascending: false }),
          scope.client!
            .from("residents")
            .select("id, full_name, unit_id")
            .eq("condominium_id", scope.condominium!.id)
            .order("full_name"),
          scope.client!
            .from("units")
            .select("id, unit_number, building_id")
            .eq("condominium_id", scope.condominium!.id),
          scope.client!
            .from("buildings")
            .select("id, name")
            .eq("condominium_id", scope.condominium!.id),
        ]);

      if (!active) {
        return;
      }
      const queryError =
        requestResult.error ??
        residentResult.error ??
        unitResult.error ??
        buildingResult.error;
      if (queryError) {
        setLoadError(queryError.message);
      } else {
        setRequests(requestResult.data ?? []);
        setResidents(residentResult.data ?? []);
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
  const residentNames = useMemo(
    () =>
      new Map(
        residents.map((resident) => [
          resident.id,
          `${resident.full_name}${
            resident.unit_id
              ? ` · ${unitLabels.get(resident.unit_id) ?? ""}`
              : ""
          }`,
        ]),
      ),
    [residents, unitLabels],
  );
  const fields: WorkspaceField[] = [
    { name: "title", label: "Assunto", required: true },
    {
      name: "category",
      label: "Categoria",
      type: "select",
      options: [
        { value: "plumbing", label: "Hidráulica" },
        { value: "electrical", label: "Elétrica" },
        { value: "cleaning", label: "Limpeza" },
        { value: "other", label: "Outro" },
      ],
    },
    {
      name: "priority",
      label: "Prioridade",
      type: "select",
      required: true,
      options: [
        { value: "low", label: "Baixa" },
        { value: "medium", label: "Média" },
        { value: "high", label: "Alta" },
        { value: "urgent", label: "Urgente" },
      ],
    },
    {
      name: "resident_id",
      label: "Solicitante",
      type: "select",
      required: !isManager,
      options: residents.map((resident) => ({
        value: resident.id,
        label: residentNames.get(resident.id) ?? resident.full_name,
      })),
    },
    {
      name: "description",
      label: "Descrição",
      type: "textarea",
      required: true,
    },
  ];
  const rows: WorkspaceRow[] = requests.map((request) => ({
    id: request.id,
    title: request.title,
    requester: request.resident_id
      ? residentNames.get(request.resident_id) ?? "Morador"
      : "Administração",
    category: request.category,
    priority: priorityLabels[request.priority ?? "medium"] ?? request.priority,
    status: statusLabels[request.status ?? "open"] ?? request.status,
    created: request.created_at
      ? new Date(request.created_at).toLocaleDateString("pt-BR")
      : "—",
  }));

  const createRequest = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium) {
        throw new Error("Condomínio não encontrado.");
      }
      const { error } = await scope.client
        .from("maintenance_requests")
        .insert({
          condominium_id: scope.condominium.id,
          title: values.title.trim(),
          description: values.description.trim(),
          category: values.category || null,
          priority: values.priority || "medium",
          status: "open",
          resident_id: values.resident_id || null,
        });
      if (error) {
        throw new Error(error.message);
      }
    },
    [scope.client, scope.condominium],
  );

  async function updateStatus(requestId: string) {
    if (!scope.client) {
      return;
    }
    const request = requests.find((entry) => entry.id === requestId);
    if (!request) {
      return;
    }
    const nextStatus =
      request.status === "open"
        ? "in_progress"
        : request.status === "in_progress"
          ? "completed"
          : "open";
    setActionError("");
    const { error } = await scope.client
      .from("maintenance_requests")
      .update({ status: nextStatus })
      .eq("id", requestId);
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
          { key: "title", label: "Assunto" },
          { key: "requester", label: "Solicitante" },
          { key: "category", label: "Categoria" },
          { key: "priority", label: "Prioridade" },
          { key: "status", label: "Situação" },
          { key: "created", label: "Criado em" },
        ]}
        description="Registre solicitações de manutenção e acompanhe seu andamento."
        emptyMessage="Nenhum chamado cadastrado."
        externalError={actionError || loadError}
        fields={fields}
        loading={loading}
        onCreate={createRequest}
        onCreated={() => setRefreshKey((key) => key + 1)}
        renderActions={
          isManager
            ? (row) => (
                <button
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => void updateStatus(row.id)}
                  type="button"
                >
                  Atualizar status
                </button>
              )
            : undefined
        }
        rows={rows}
        title="Manutenção"
      />
    </ScopeGate>
  );
}
