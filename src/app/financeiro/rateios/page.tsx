"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  calculateUtilityShares,
  type UtilityAllocationMethod,
  type UtilityShare,
} from "@/modules/financeiro/utility-allocation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Condominium = Pick<Tables<"condominiums">, "id" | "name">;
type Unit = Pick<
  Tables<"units">,
  "id" | "unit_number" | "status" | "building_id"
> & { buildingName: string };
type UtilityCharge = Pick<
  Tables<"utility_charges">,
  | "id"
  | "utility_type"
  | "competence"
  | "total_amount"
  | "allocation_method"
  | "published_at"
>;
type UtilityChargeItem = Pick<
  Tables<"utility_charge_items">,
  | "id"
  | "utility_charge_id"
  | "unit_id"
  | "consumption"
  | "amount"
  | "paid"
  | "paid_at"
>;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCompetence(competence: string) {
  return new Date(`${competence}T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function parseConsumption(value: string | undefined) {
  return value === undefined || value.trim() === "" ? undefined : Number(value);
}

export default function UtilityAllocationsPage() {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [condominiumId, setCondominiumId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [charges, setCharges] = useState<UtilityCharge[]>([]);
  const [items, setItems] = useState<UtilityChargeItem[]>([]);
  const [expandedChargeId, setExpandedChargeId] = useState<string | null>(null);
  const [utilityType, setUtilityType] = useState<"water" | "gas">("water");
  const [competence, setCompetence] = useState(currentMonth);
  const [totalAmount, setTotalAmount] = useState("");
  const [method, setMethod] = useState<UtilityAllocationMethod>("equal_units");
  const [consumptions, setConsumptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const occupiedUnits = useMemo(
    () => units.filter((unit) => unit.status === "occupied"),
    [units],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );
  const preview = useMemo(() => {
    if (!totalAmount || occupiedUnits.length === 0) {
      return [];
    }

    const parsedAmount = Number(totalAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return [];
    }

    try {
      return calculateUtilityShares(
        parsedAmount,
        method,
        occupiedUnits.map((unit) => ({
          id: unit.id,
          consumption:
            method === "metered"
              ? parseConsumption(consumptions[unit.id])
              : undefined,
        })),
      );
    } catch {
      return [];
    }
  }, [consumptions, method, occupiedUnits, totalAmount]);

  useEffect(() => {
    let active = true;

    async function loadCondominiums() {
      setLoading(true);
      setErrorMessage("");
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        if (active) {
          setErrorMessage(authError.message);
          setLoading(false);
        }
        return;
      }

      if (!user) {
        window.location.assign("/login");
        return;
      }

      const { data: membershipData, error: membershipError } = await supabase
        .from("condominium_members")
        .select("condominium_id, role")
        .eq("user_id", user.id);

      if (membershipError) {
        if (active) {
          setErrorMessage(membershipError.message);
          setLoading(false);
        }
        return;
      }

      const memberships: Pick<
        Tables<"condominium_members">,
        "condominium_id" | "role"
      >[] = membershipData ?? [];
      const ids = [
        ...new Set(
          memberships
            .filter(
              (membership) =>
                membership.role === "administrator" ||
                membership.role === "syndic",
            )
            .map((membership) => membership.condominium_id),
        ),
      ];
      if (ids.length === 0) {
        if (active) {
          setCondominiums([]);
          setLoading(false);
        }
        return;
      }

      const { data, error: condominiumError } = await supabase
        .from("condominiums")
        .select("id, name")
        .in("id", ids)
        .order("name");

      if (!active) {
        return;
      }

      if (condominiumError) {
        setErrorMessage(condominiumError.message);
      } else {
        const availableCondominiums: Condominium[] = data ?? [];
        setCondominiums(availableCondominiums);
        setCondominiumId((current) =>
          availableCondominiums.some((condominium) => condominium.id === current)
            ? current
            : (availableCondominiums[0]?.id ?? ""),
        );
      }
      setLoading(false);
    }

    void loadCondominiums();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!condominiumId) {
      setUnits([]);
      setCharges([]);
      setItems([]);
      return;
    }

    let active = true;

    async function loadCondominiumData() {
      setLoading(true);
      setErrorMessage("");
      const supabase = createClient();

      const [unitResult, buildingResult, chargeResult] = await Promise.all([
        supabase
          .from("units")
          .select("id, unit_number, status, building_id")
          .eq("condominium_id", condominiumId)
          .order("unit_number"),
        supabase
          .from("buildings")
          .select("id, name")
          .eq("condominium_id", condominiumId)
          .order("name"),
        supabase
          .from("utility_charges")
          .select(
            "id, utility_type, competence, total_amount, allocation_method, published_at",
          )
          .eq("condominium_id", condominiumId)
          .order("competence", { ascending: false })
          .limit(12),
      ]);

      if (!active) {
        return;
      }

      const queryError = unitResult.error ?? buildingResult.error ?? chargeResult.error;
      if (queryError) {
        setErrorMessage(queryError.message);
        setLoading(false);
        return;
      }

      const buildingRows: Pick<Tables<"buildings">, "id" | "name">[] =
        buildingResult.data ?? [];
      const buildingNames = new Map(
        buildingRows.map((building) => [building.id, building.name]),
      );
      const unitRows: Pick<
        Tables<"units">,
        "id" | "unit_number" | "status" | "building_id"
      >[] = unitResult.data ?? [];
      const loadedUnits: Unit[] = unitRows.map((unit) => ({
        ...unit,
        buildingName: buildingNames.get(unit.building_id) ?? "Bloco",
      }));
      const loadedCharges: UtilityCharge[] = chargeResult.data ?? [];
      setUnits(loadedUnits);
      setCharges(loadedCharges);
      setExpandedChargeId((current) =>
        loadedCharges.some((charge) => charge.id === current)
          ? current
          : (loadedCharges[0]?.id ?? null),
      );
      setConsumptions((current) =>
        Object.fromEntries(
          loadedUnits
            .filter((unit) => unit.status === "occupied")
            .map((unit) => [unit.id, current[unit.id] ?? ""]),
        ),
      );

      const chargeIds = loadedCharges.map((charge) => charge.id);
      if (chargeIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: itemData, error: itemError } = await supabase
        .from("utility_charge_items")
        .select(
          "id, utility_charge_id, unit_id, consumption, amount, paid, paid_at",
        )
        .in("utility_charge_id", chargeIds);

      if (!active) {
        return;
      }

      if (itemError) {
        setErrorMessage(itemError.message);
      } else {
        const loadedItems: UtilityChargeItem[] = itemData ?? [];
        setItems(loadedItems);
      }
      setLoading(false);
    }

    void loadCondominiumData();

    return () => {
      active = false;
    };
  }, [condominiumId, refreshKey]);

  const handleCreateAllocation = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setMessage("");
      setErrorMessage("");

      const amount = Number(totalAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        setErrorMessage("Informe um valor total válido.");
        return;
      }

      let shares: UtilityShare[];
      try {
        shares = calculateUtilityShares(
          amount,
          method,
          occupiedUnits.map((unit) => ({
            id: unit.id,
            consumption:
              method === "metered"
                ? parseConsumption(consumptions[unit.id])
                : undefined,
          })),
        );
      } catch (allocationError) {
        setErrorMessage(
          allocationError instanceof Error
            ? allocationError.message
            : "Não foi possível calcular o rateio.",
        );
        return;
      }

      setSaving(true);
      const supabase = createClient();
      const { error: saveError } = await supabase.rpc(
        "create_utility_charge_with_shares",
        {
          target_condominium_id: condominiumId,
          target_utility_type: utilityType,
          target_competence: `${competence}-01`,
          target_total_amount: amount,
          target_allocation_method: method,
          target_items: shares.map((share) => ({
            unit_id: share.unitId,
            consumption:
              method === "metered"
                ? parseConsumption(consumptions[share.unitId]) ?? null
                : null,
            amount: share.amount,
          })),
        },
      );
      setSaving(false);

      if (saveError) {
        setErrorMessage(saveError.message);
        return;
      }

      setTotalAmount("");
      setMessage("Rateio criado e publicado com sucesso.");
      setRefreshKey((key) => key + 1);
    },
    [
      competence,
      condominiumId,
      consumptions,
      method,
      occupiedUnits,
      totalAmount,
      utilityType,
    ],
  );

  async function togglePayment(item: UtilityChargeItem) {
    setBusyItemId(item.id);
    setErrorMessage("");
    setMessage("");
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("utility_charge_items")
      .update({
        paid: !item.paid,
        paid_at: item.paid ? null : new Date().toISOString(),
      })
      .eq("id", item.id);

    setBusyItemId(null);
    if (updateError) {
      setErrorMessage(updateError.message);
      return;
    }

    setMessage("Status de pagamento atualizado.");
    setRefreshKey((key) => key + 1);
  }

  const selectedCondominium = condominiums.find(
    (condominium) => condominium.id === condominiumId,
  );

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <Link
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
        href="/financeiro"
      >
        ← Financeiro
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Condo.ai
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Rateio de água e gás
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Distribua a conta por unidade ou proporcionalmente ao consumo medido.
          </p>
        </div>
        {condominiums.length > 1 && (
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Condomínio
            <select
              className="min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              onChange={(event) => setCondominiumId(event.target.value)}
              value={condominiumId}
            >
              {condominiums.map((condominium) => (
                <option key={condominium.id} value={condominium.id}>
                  {condominium.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {(errorMessage || message) && (
        <div
          aria-live="polite"
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
          role={errorMessage ? "alert" : "status"}
        >
          {errorMessage || message}
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-sm text-slate-600">Carregando dados...</p>
      ) : condominiums.length === 0 ? (
        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">
            Acesso de administrador necessário
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Entre com uma conta vinculada como administrador ou síndico para
            gerenciar os rateios.
          </p>
        </section>
      ) : (
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Novo rateio
            </h2>
            {selectedCondominium && (
              <p className="mt-1 text-sm text-slate-500">
                {selectedCondominium.name}
              </p>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleCreateAllocation}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Despesa
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                    onChange={(event) =>
                      setUtilityType(event.target.value as "water" | "gas")
                    }
                    value={utilityType}
                  >
                    <option value="water">Água</option>
                    <option value="gas">Gás</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Competência
                  <input
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                    onChange={(event) => setCompetence(event.target.value)}
                    required
                    type="month"
                    value={competence}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Valor total da conta (R$)
                  <input
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                    min="0"
                    onChange={(event) => setTotalAmount(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={totalAmount}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Método de rateio
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                    onChange={(event) =>
                      setMethod(event.target.value as UtilityAllocationMethod)
                    }
                    value={method}
                  >
                    <option value="equal_units">Divisão igual por unidade</option>
                    <option value="metered">Proporcional ao consumo</option>
                  </select>
                </label>
              </div>

              {occupiedUnits.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Não há unidades ocupadas cadastradas neste condomínio.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Prévia por unidade
                    </h3>
                    <span className="text-xs text-slate-500">
                      {occupiedUnits.length} unidades ocupadas
                    </span>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Unidade</th>
                          {method === "metered" && (
                            <th className="px-4 py-3 font-medium">Consumo</th>
                          )}
                          <th className="px-4 py-3 text-right font-medium">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {occupiedUnits.map((unit) => {
                          const share = preview.find(
                            (entry) => entry.unitId === unit.id,
                          );

                          return (
                            <tr key={unit.id}>
                              <td className="px-4 py-3 text-slate-800">
                                {unit.buildingName} · {unit.unit_number}
                              </td>
                              {method === "metered" && (
                                <td className="px-4 py-2">
                                  <input
                                    aria-label={`Consumo da unidade ${unit.unit_number}`}
                                    className="w-28 rounded-md border border-slate-300 px-2.5 py-1.5"
                                    min="0"
                                    onChange={(event) =>
                                      setConsumptions((current) => ({
                                        ...current,
                                        [unit.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="m³"
                                    step="0.001"
                                    type="number"
                                    value={consumptions[unit.id] ?? ""}
                                  />
                                </td>
                              )}
                              <td className="px-4 py-3 text-right font-medium text-slate-900">
                                {share ? currency.format(share.amount) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {preview.length > 0 && (
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      Total rateado:{" "}
                      {currency.format(
                        preview.reduce((sum, share) => sum + share.amount, 0),
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                disabled={saving || occupiedUnits.length === 0}
                type="submit"
              >
                {saving ? "Publicando..." : "Confirmar e publicar rateio"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Rateios recentes
            </h2>
            {charges.length === 0 ? (
              <p className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Nenhum rateio publicado ainda.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {charges.map((charge) => {
                  const chargeItems = items.filter(
                    (item) => item.utility_charge_id === charge.id,
                  );
                  const isExpanded = expandedChargeId === charge.id;

                  return (
                    <article
                      className="overflow-hidden rounded-xl border border-slate-200"
                      key={charge.id}
                    >
                      <button
                        aria-expanded={isExpanded}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                        onClick={() =>
                          setExpandedChargeId(isExpanded ? null : charge.id)
                        }
                        type="button"
                      >
                        <span>
                          <span className="block font-semibold text-slate-900">
                            {charge.utility_type === "water" ? "Água" : "Gás"} ·{" "}
                            {formatCompetence(charge.competence)}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {charge.allocation_method === "equal_units"
                              ? "Divisão igual"
                              : "Por consumo"}{" "}
                            · {chargeItems.filter((item) => item.paid).length}/
                            {chargeItems.length} pagos
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-semibold text-slate-900">
                            {currency.format(charge.total_amount)}
                          </span>
                          <span className="mt-1 block text-xs text-emerald-700">
                            {charge.published_at ? "Publicado" : "Rascunho"}
                          </span>
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-200">
                          {chargeItems.length === 0 ? (
                            <p className="px-4 py-5 text-sm text-slate-500">
                              Carregando ou sem unidades neste rateio.
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {chargeItems.map((item) => {
                                const unit = unitById.get(item.unit_id);

                                return (
                                  <div
                                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                                    key={item.id}
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-slate-800">
                                        {unit
                                          ? `${unit.buildingName} · ${unit.unit_number}`
                                          : "Unidade removida"}
                                      </p>
                                      <p className="mt-0.5 text-xs text-slate-500">
                                        {item.consumption !== null
                                          ? `${item.consumption} m³ · `
                                          : ""}
                                        {item.paid ? "Pago" : "Pendente"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-semibold text-slate-900">
                                        {currency.format(item.amount)}
                                      </span>
                                      <button
                                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                        disabled={busyItemId === item.id}
                                        onClick={() => void togglePayment(item)}
                                        type="button"
                                      >
                                        {busyItemId === item.id
                                          ? "Salvando..."
                                          : item.paid
                                            ? "Desfazer"
                                            : "Marcar pago"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
