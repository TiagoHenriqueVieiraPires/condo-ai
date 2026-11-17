export type UtilityAllocationMethod = "equal_units" | "metered";

export type UtilityUnitInput = {
  id: string;
  consumption?: number;
};

export type UtilityShare = {
  unitId: string;
  amount: number;
};

export function calculateUtilityShares(
  totalAmount: number,
  method: UtilityAllocationMethod,
  units: UtilityUnitInput[],
): UtilityShare[] {
  const totalCents = Math.round(totalAmount * 100);

  if (
    !Number.isFinite(totalAmount) ||
    totalAmount < 0 ||
    !Number.isSafeInteger(totalCents)
  ) {
    throw new Error("Informe um valor total válido.");
  }

  if (units.length === 0) {
    throw new Error("Cadastre ao menos uma unidade ocupada para gerar o rateio.");
  }

  const weights = units.map((unit) => {
    if (method === "equal_units") {
      return 1;
    }

    if (
      unit.consumption === undefined ||
      !Number.isFinite(unit.consumption) ||
      unit.consumption < 0
    ) {
      throw new Error("Informe o consumo de cada unidade.");
    }

    const consumptionInThousandths = Math.round(unit.consumption * 1000);
    if (!Number.isSafeInteger(consumptionInThousandths)) {
      throw new Error("O consumo informado excede o limite permitido.");
    }

    return consumptionInThousandths;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
    throw new Error("O consumo total precisa ser maior que zero.");
  }

  const portions = units.map((unit, index) => {
    const exactCents = totalCents * (weights[index] / totalWeight);
    const baseCents = Math.floor(exactCents);

    return {
      unitId: unit.id,
      cents: baseCents,
      remainder: exactCents - baseCents,
      index,
    };
  });

  const centsLeft =
    totalCents - portions.reduce((sum, portion) => sum + portion.cents, 0);
  if (centsLeft < 0 || centsLeft >= portions.length) {
    throw new Error("Não foi possível arredondar os valores do rateio.");
  }

  [...portions]
    .sort(
      (left, right) =>
        right.remainder - left.remainder || left.index - right.index,
    )
    .slice(0, centsLeft)
    .forEach((portion) => {
      portions[portion.index].cents += 1;
    });

  return portions.map(({ unitId, cents }) => ({
    unitId,
    amount: cents / 100,
  }));
}
