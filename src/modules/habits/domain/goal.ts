// Measurable habits: a daily target in a unit (glasses, minutes, kg). Pure; tested in goal.test.ts.

import type { Completion } from './streak';
import type { Aggregation } from '../data/schema';

export type { Aggregation };

/** A measurable habit's goal: what it counts, the daily target and how amounts roll up. */
export type Goal = { unit: string; target: number; aggregation: Aggregation };

export const aggregations: readonly { value: Aggregation; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'max', label: 'Best day' },
  { value: 'last', label: 'Latest' },
];

/** A habit with a positive daily target is measured by an amount; others are done or not. */
export function isMeasurable(habit: { target?: number | null }): boolean {
  return habit.target != null && habit.target > 0;
}

/** A goal is met when a plain habit reaches the target, or a quit habit stays at or under its limit. */
export function isAmountDone(
  habit: { target?: number | null; quit?: boolean | null },
  amount: number,
): boolean {
  const target = habit.target ?? 0;
  return habit.quit ? amount <= target : amount >= target;
}

/**
 * The completions that make a day done: every day of a plain habit, and for a measurable one the
 * days that reached the target (a day without an amount is a plain "done", kept from before the
 * habit was measurable).
 */
export function countingCompletions(
  habits: readonly { id: string; target?: number | null; quit?: boolean | null }[],
  completions: readonly Completion[],
): Completion[] {
  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  return completions.filter((completion) => {
    const habit = byId.get(completion.habitId);
    if (!habit) return false;
    if (!isMeasurable(habit) || completion.amount == null) return true;
    return isAmountDone(habit, completion.amount);
  });
}

/** Each habit's done dates, with the target honoured; the set every screen reads. */
export function doneDatesFor(
  habits: readonly { id: string; target?: number | null; quit?: boolean | null }[],
  completions: readonly Completion[],
): Map<string, Set<string>> {
  const byHabit = new Map<string, Set<string>>();
  for (const { habitId, date } of countingCompletions(habits, completions)) {
    const dates = byHabit.get(habitId) ?? new Set<string>();
    dates.add(date);
    byHabit.set(habitId, dates);
  }
  return byHabit;
}

/** Rolls amounts (in date order) up over a period; 0 without any. */
export function periodAmount(aggregation: Aggregation, amounts: readonly number[]): number {
  if (amounts.length === 0) return 0;
  switch (aggregation) {
    case 'sum':
      return amounts.reduce((total, amount) => total + amount, 0);
    case 'avg':
      return amounts.reduce((total, amount) => total + amount, 0) / amounts.length;
    case 'max':
      return Math.max(...amounts);
    case 'last':
      return amounts[amounts.length - 1] ?? 0;
  }
}

/** "2.5 L", "3 glasses": up to two decimals, then the unit. */
export function formatAmount(amount: number, unit?: string | null): string {
  const text = String(Number(amount.toFixed(2)));
  return unit ? `${text} ${unit}` : text;
}

/** How far an amount is to its target, 0–1. */
export function amountProgress(amount: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, amount / target));
}

export type AmountChange = { habitId: string; date: string; amount: number | null };

/** The completions after logging an amount on a day (null clears it): the optimistic cache update. */
export function setAmount(
  completions: readonly Completion[],
  { habitId, date, amount }: AmountChange,
): Completion[] {
  const others = completions.filter((row) => row.habitId !== habitId || row.date !== date);
  return amount === null ? others : [...others, { habitId, date, amount }];
}

/** A goal needs a target above zero. */
export function isValidGoal(goal: Goal): boolean {
  return Number.isFinite(goal.target) && goal.target > 0;
}

/** How much the − and + buttons change an amount, by the size of the target. */
export function amountStep(target: number): number {
  if (target < 1) return 0.1;
  return target < 5 ? 0.5 : 1;
}

const trimDecimals = (value: number) => String(value);

/** A compact amount for a small cell: "5", "2.5", "1.3k", "12k", "1.5M". */
export function shortAmount(amount: number): string {
  if (amount >= 1_000_000) return `${trimDecimals(Math.round(amount / 100_000) / 10)}M`;
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return thousands < 10
      ? `${trimDecimals(Math.round(thousands * 10) / 10)}k`
      : `${Math.round(thousands)}k`;
  }
  return String(Number(amount.toFixed(2)));
}

/**
 * How far each logged day got to the target, 0–1, by date: a day without an amount counts as done
 * (kept from before the habit was measurable).
 */
export function amountFractions(
  target: number,
  completions: readonly Completion[],
  quit = false,
): Map<string, number> {
  return new Map(
    completions.map((row) => {
      if (row.amount == null) return [row.date, 1];
      if (quit) return [row.date, row.amount <= target ? 1 : 0];
      return [row.date, amountProgress(row.amount, target)];
    }),
  );
}

/** What each habit was given on each day: habit id → date → amount (days without one are left out). */
export function amountsByHabit(
  completions: readonly Completion[],
): Map<string, Map<string, number>> {
  const byHabit = new Map<string, Map<string, number>>();
  for (const { habitId, date, amount } of completions) {
    if (amount == null) continue;
    const days = byHabit.get(habitId) ?? new Map<string, number>();
    days.set(date, amount);
    byHabit.set(habitId, days);
  }
  return byHabit;
}
