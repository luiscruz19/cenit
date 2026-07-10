export const PERIODS = [
    { value: '7d', label: '7 días' },
    { value: '28d', label: '28 días' },
    { value: '90d', label: '90 días' },
] as const;

export type Period = (typeof PERIODS)[number]['value'];

export const DEFAULT_PERIOD: Period = '28d';

export const parsePeriod = (value: string | null | undefined): Period =>
    (PERIODS.some((p) => p.value === value) ? value : DEFAULT_PERIOD) as Period;
