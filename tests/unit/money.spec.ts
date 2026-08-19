import { normaliseAmount, parseCurrencyFactor, roundMoney } from '../../src/Resources/app/administration/src/widget/analytics/_common/money';

describe('roundMoney', () => {
    it('snaps the Total Sales leftover from issue #10', () => {
        expect(roundMoney(99.000999)).toBe(99);
    });

    it.each([
        [99.006, 99.01],
        [99.004, 99],
        [0.1 + 0.2, 0.3],
        [1234.567, 1234.57],
        [0, 0],
        [-99.000999, -99],
    ])('rounds %s to %s', (input, expected) => {
        expect(roundMoney(input)).toBe(expected);
    });
});

describe('normaliseAmount', () => {
    it('divides by the currency factor then rounds to cents', () => {
        expect(normaliseAmount(99.000999, 1)).toBe(99);
        expect(normaliseAmount(198.001998, 2)).toBe(99);
    });

    it('matches the Total Sales accumulation used for a single currency bucket', () => {
        const factor = 1;
        let summary = 0;
        const detail: Record<string, number> = {};

        [33.000333, 33.000333, 33.000333].forEach((sum, index) => {
            const amount = normaliseAmount(sum, factor);
            const key = `2026-08-1${index}`;
            detail[key] = roundMoney((detail[key] ?? 0) + amount);
            summary = roundMoney(summary + amount);
        });

        expect(Object.values(detail)).toEqual([33, 33, 33]);
        expect(summary).toBe(99);
    });
});

describe('parseCurrencyFactor', () => {
    it.each([
        [1, 1],
        ['1.25', 1.25],
        [2, 2],
    ])('accepts %s', (input, expected) => {
        expect(parseCurrencyFactor(input)).toBe(expected);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, '', 'abc'])('rejects %s', (input) => {
        expect(parseCurrencyFactor(input)).toBeNull();
    });
});
