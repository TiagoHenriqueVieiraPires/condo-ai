"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  EntityWorkspace,
  type WorkspaceField,
  type WorkspaceRow,
} from "@/modules/shared/entity-workspace";
import { ScopeGate } from "@/modules/shared/scope-gate";
import { useCondominiumScope } from "@/modules/shared/use-condominium";
import type { Tables } from "@/types/database.types";

type Bill = Pick<
  Tables<"bills">,
  "id" | "unit_id" | "competence" | "amount" | "due_date" | "paid" | "paid_at"
>;
type Unit = Pick<Tables<"units">, "id" | "unit_number" | "building_id">;
type Building = Pick<Tables<"buildings">, "id" | "name">;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function FinancePage() {
  const scope = useCondominiumScope();
  const [bills, setBills] = useState<Bill[]>([]);
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
      const [billResult, unitResult, buildingResult] = await Promise.all([
        scope.client!
          .from("bills")
          .select("id, unit_id, competence, amount, due_date, paid, paid_at")
          .eq("condominium_id", scope.condominium!.id)
          .order("competence", { ascending: false }),
        scope.client!
          .from("units")
          .select("id, unit_number, building_id")
          .eq("condominium_id", scope.condominium!.id)
          .order("unit_number"),
        scope.client!
          .from("buildings")
          .select("id, name")
          .eq("condominium_id", scope.condominium!.id),
      ]);

      if (!active) {
        return;
      }
      const queryError = billResult.error ?? unitResult.error ?? buildingResult.error;
      if (queryError) {
        setLoadError(queryError.message);
      } else {
        setBills(billResult.data ?? []);
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
    {
      name: "unit_id",
      label: "Unidade",
      type: "select",
      required: true,
      options: availableUnits.map((unit) => ({
        value: unit.id,
        label: unitLabels.get(unit.id) ?? unit.unit_number,
      })),
    },
    { name: "competence", label: "Competência", type: "date", required: true },
    {
      name: "amount",
      label: "Valor (R$)",
      type: "number",
      min: 0.01,
      step: 0.01,
      required: true,
    },
    { name: "due_date", label: "Vencimento", type: "date", required: true },
  ];
  const rows: WorkspaceRow[] = bills.map((bill) => ({
    id: bill.id,
    unit: unitLabels.get(bill.unit_id) ?? "Unidade",
    competence: new Date(`${bill.competence}T12:00:00`).toLocaleDateString(
      "pt-BR",
      { month: "long", year: "numeric" },
    ),
    amount: currency.format(bill.amount),
    due: new Date(`${bill.due_date}T12:00:00`).toLocaleDateString("pt-BR"),
    status: bill.paid ? "Pago" : "Pendente",
  }));

  const createBill = useCallback(
    async (values: Record<string, string>) => {
      if (!scope.client || !scope.condominium || !isManager) {
        throw new Error("Seu perfil não pode criar cobranças.");
      }
      const amount = Number(values.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Informe um valor de cobrança maior que zero.");
      }

      const { error } = await scope.client.from("bills").insert({
        condominium_id: scope.condominium.id,
        unit_id: values.unit_id,
        competence: values.competence,
        amount,
        due_date: values.due_date,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    [isManager, scope.client, scope.condominium],
  );

  async function togglePayment(billId: string) {
    if (!scope.client) {
      return;
    }
    const bill = bills.find((entry) => entry.id === billId);
    if (!bill) {
      return;
    }
    setActionError("");
    const { error } = await scope.client
      .from("bills")
      .update({
        paid: !bill.paid,
        paid_at: bill.paid ? null : new Date().toISOString(),
      })
      .eq("id", billId);
    if (error) {
      setActionError(error.message);
      return;
    }
    setRefreshKey((key) => key + 1);
  }

  return (
    <ScopeGate scope={scope}>
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Financeiro
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Cobranças por unidade e rateios mensais de água e gás.
              </p>
            </div>
            {isManager && (
              <Link
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                href="/financeiro/rateios"
              >
                Rateio de água e gás
              </Link>
            )}
          </div>
        </section>
        <EntityWorkspace
          columns={[
            { key: "unit", label: "Unidade" },
            { key: "competence", label: "Competência" },
            { key: "amount", label: "Valor" },
            { key: "due", label: "Vencimento" },
            { key: "status", label: "Situação" },
          ]}
          createLabel="Criar cobrança"
          description="Lance cobranças manuais e acompanhe pagamentos sem integração externa."
          emptyMessage="Nenhuma cobrança cadastrada."
          externalError={actionError || loadError}
          fields={isManager ? fields : []}
          loading={loading}
          onCreate={isManager ? createBill : undefined}
          onCreated={() => setRefreshKey((key) => key + 1)}
          renderActions={
            isManager
              ? (row) => {
                  const bill = bills.find((entry) => entry.id === row.id);
                  return (
                    <button
                      className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => void togglePayment(row.id)}
                      type="button"
                    >
                      {bill?.paid ? "Desfazer pagamento" : "Marcar pago"}
                    </button>
                  );
                }
              : undefined
          }
          rows={rows}
          title="Cobranças"
        />
      </div>
    </ScopeGate>
  );
}
