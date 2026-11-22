export const FIRST_DAY = "2024-01-01";
export const LAST_DAY = "2026-10-31";

export type Day = {
  iso: string;
  year: number;
  month: number;
  dayOfMonth: number;
  weekday: number;
  progress: number;
};

const MS_PER_DAY = 86_400_000;

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toDate(iso).getTime() + days * MS_PER_DAY));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / MS_PER_DAY);
}

export function eachDay(first: string, last: string): Day[] {
  const span = daysBetween(first, last);
  return Array.from({ length: span + 1 }, (_, offset) => {
    const date = new Date(toDate(first).getTime() + offset * MS_PER_DAY);
    return {
      iso: toIso(date),
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      dayOfMonth: date.getUTCDate(),
      weekday: date.getUTCDay(),
      progress: offset / span,
    };
  });
}

export function blackFriday(year: number): string {
  const firstOfNovember = toDate(`${year}-11-01`);
  const daysToThursday = (4 - firstOfNovember.getUTCDay() + 7) % 7;
  return addDays(toIso(firstOfNovember), daysToThursday + 21 + 1);
}

export function isWithin(iso: string, first: string, last: string): boolean {
  return iso >= first && iso <= last;
}

export function localMonth(month: number, southernHemisphere: boolean): number {
  return southernHemisphere ? ((month + 5) % 12) + 1 : month;
}
