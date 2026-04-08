const BASE_CURRENCY = "CAD";
const SUPPORTED_CURRENCIES = ["CAD", "USD", "EUR", "GBP", "INR"] as const;

type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

type RateResponse = {
  result?: string;
  rates?: Record<string, number>;
};

const rateCache = new Map<string, { expiresAt: number; rates: Record<string, number> }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function normalizeCurrency(value: string | undefined | null): SupportedCurrency {
  const normalized = String(value ?? BASE_CURRENCY).trim().toUpperCase();
  if (SUPPORTED_CURRENCIES.includes(normalized as SupportedCurrency)) {
    return normalized as SupportedCurrency;
  }

  throw new Error(`Unsupported currency: ${normalized}`);
}

function buildRatesUrl(baseCurrency: SupportedCurrency) {
  const customUrl = process.env.EXCHANGE_RATE_API_URL?.trim();

  if (customUrl) {
    return customUrl.replace("{base}", encodeURIComponent(baseCurrency));
  }

  return `https://open.er-api.com/v6/latest/${encodeURIComponent(baseCurrency)}`;
}

async function loadRates(baseCurrency: SupportedCurrency) {
  if (baseCurrency === BASE_CURRENCY) {
    return { [BASE_CURRENCY]: 1 };
  }

  const cached = rateCache.get(baseCurrency);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rates;
  }

  const response = await fetch(buildRatesUrl(baseCurrency));

  if (!response.ok) {
    throw new Error(`Exchange-rate API request failed (${response.status})`);
  }

  const body = (await response.json()) as RateResponse;
  if (!body.rates || typeof body.rates[BASE_CURRENCY] !== "number") {
    throw new Error("Exchange-rate API did not return a usable CAD rate");
  }

  rateCache.set(baseCurrency, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    rates: body.rates,
  });

  return body.rates;
}

export async function convertAmountToBase(
  amount: number,
  sourceCurrencyInput: string | undefined | null,
) {
  const sourceCurrency = normalizeCurrency(sourceCurrencyInput);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  if (sourceCurrency === BASE_CURRENCY) {
    return {
      currency: sourceCurrency,
      exchangeRateToBase: 1,
      convertedAmount: Number(amount.toFixed(2)),
    };
  }

  const rates = await loadRates(sourceCurrency);
  const exchangeRateToBase = rates[BASE_CURRENCY];

  if (typeof exchangeRateToBase !== "number" || exchangeRateToBase <= 0) {
    throw new Error(`Unable to convert ${sourceCurrency} to ${BASE_CURRENCY}`);
  }

  return {
    currency: sourceCurrency,
    exchangeRateToBase,
    convertedAmount: Number((amount * exchangeRateToBase).toFixed(2)),
  };
}

export function convertAmountFromBase(
  amountInBase: number,
  targetCurrencyInput: string | undefined | null,
  exchangeRateToBase: number | undefined | null,
) {
  const targetCurrency = normalizeCurrency(targetCurrencyInput);
  const rate = Number(exchangeRateToBase ?? 1);

  if (targetCurrency === BASE_CURRENCY || !Number.isFinite(rate) || rate <= 0) {
    return Number(amountInBase.toFixed(2));
  }

  return Number((amountInBase / rate).toFixed(2));
}

export function splitConvertedAmounts(totalConvertedAmount: number, weights: number[]) {
  const totalCents = Math.round(totalConvertedAmount * 100);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  if (totalWeight <= 0) {
    return weights.map(() => 0);
  }

  const rawShares = weights.map((value) => (totalCents * value) / totalWeight);
  const baseShares = rawShares.map((value) => Math.floor(value));
  let remainder = totalCents - baseShares.reduce((sum, value) => sum + value, 0);

  const ranked = rawShares
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < ranked.length && remainder > 0; i += 1) {
    baseShares[ranked[i].index] += 1;
    remainder -= 1;
  }

  return baseShares.map((value) => value / 100);
}

export { BASE_CURRENCY, SUPPORTED_CURRENCIES, normalizeCurrency };
