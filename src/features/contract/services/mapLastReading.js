export const EMPTY_LAST_READING = Object.freeze({
  index: 0,
  consumption: 0,
  amount: 0,
  unitPrice: 0,
  date: "-",
});

export function mapNewContextToLastReading(data) {
  if (!data) return EMPTY_LAST_READING;

  const {
    lastCurrentIndex,
    lastPreviouskWh,
    lastNetAmount,
    lastUnitPrice,
    lastYear,
    lastMonth,
  } = data;

  const formattedPeriod =
    lastYear && lastMonth ? `${lastYear}/${String(lastMonth).padStart(2, "0")}` : "-";

  return {
    index: lastCurrentIndex ?? 0,
    consumption: lastPreviouskWh ?? 0,
    amount: lastNetAmount ?? 0,
    unitPrice: lastUnitPrice ?? 0,
    date: formattedPeriod,
  };
}
