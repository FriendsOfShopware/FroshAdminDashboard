/**
 * Currency-normalisation helpers for analytics widgets.
 * Kept Shopware-free so they can be unit-tested in Node/Jest.
 */

export function parseCurrencyFactor(value: string | number): number | null {
    const factor = Number(value);

    return Number.isFinite(factor) && factor > 0 ? factor : null;
}

/**
 * Snap a currency amount to 2 decimal places. Dividing DAL sums by
 * `currencyFactor` produces IEEE-754 leftovers such as `99.000999`.
 */
export function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Convert a raw order amount into the system currency and round to cents. */
export function normaliseAmount(sum: number, factor: number): number {
    return roundMoney(sum / factor);
}
