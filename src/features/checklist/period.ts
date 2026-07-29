import { startOfMonth } from "date-fns/startOfMonth";
import { startOfWeek } from "date-fns/startOfWeek";
import { formatISO } from "date-fns/formatISO";
import { addDays } from "date-fns/addDays";
import type { ChecklistItem } from "./types";

export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function periodKeyDaily(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function periodKeyWeekly(d = new Date()) {
  const start = startOfWeek(d, { weekStartsOn: 1 });
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth() + 1;
  const day = start.getUTCDate();
  return `${y}-W${isoWeekNumber(start)}-${pad2(m)}-${pad2(day)}`;
}

export function periodKeyMonthly(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

export function periodKeyForItem(
  item: ChecklistItem,
  opts: { now?: Date; lastCheckedAt?: string | null } = {},
): string {
  const { now = new Date(), lastCheckedAt } = opts;
  switch (item.periodType) {
    case "DAILY":
      return periodKeyDaily(now);
    case "WEEKLY":
      return periodKeyWeekly(now);
    case "MONTHLY":
      return periodKeyMonthly(now);
    case "BIWEEKLY": {
      if (lastCheckedAt) {
        const base = new Date(lastCheckedAt);
        const next = addDays(base, 15);
        if (next.getTime() > now.getTime()) {
          return periodKeyDaily(base);
        }
      }
      return periodKeyDaily(now);
    }
  }
}

export function isCheckedForCurrentPeriod(
  item: ChecklistItem,
  completionCheckedAt: string | null,
  now = new Date(),
): boolean {
  if (!completionCheckedAt) return false;
  const last = new Date(completionCheckedAt).getTime();
  switch (item.periodType) {
    case "DAILY": {
      const key = periodKeyDaily(now);
      return periodKeyDaily(new Date(last)) === key;
    }
    case "WEEKLY": {
      const key = periodKeyWeekly(now);
      return periodKeyWeekly(new Date(last)) === key;
    }
    case "MONTHLY": {
      const key = periodKeyMonthly(now);
      return periodKeyMonthly(new Date(last)) === key;
    }
    case "BIWEEKLY": {
      return addDays(new Date(last), 15).getTime() > now.getTime();
    }
  }
}

export function isOverdue(
  item: ChecklistItem,
  completionCheckedAt: string | null,
  now = new Date(),
): boolean {
  if (item.periodType !== "BIWEEKLY") return false;
  if (!completionCheckedAt) return true;
  return addDays(new Date(completionCheckedAt), 15).getTime() < now.getTime();
}

export function humanPeriod(item: ChecklistItem): string {
  switch (item.periodType) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return humanWeekday(item.periodRule);
    case "BIWEEKLY":
      return "Every 15 days";
    case "MONTHLY":
      return item.periodRule ? `Every month on day ${item.periodRule}` : "Every month";
  }
}

export function humanWeekday(rule?: string): string {
  const map: Record<string, string> = {
    MON: "Every Monday",
    TUE: "Every Tuesday",
    WED: "Every Wednesday",
    THU: "Every Thursday",
    FRI: "Every Friday",
    SAT: "Every Saturday",
    SUN: "Every Sunday",
  };
  return rule ? map[rule.toUpperCase()] ?? "Every week" : "Every week";
}

export function formatCheckedAt(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function isoWeekNumber(date: Date): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return pad2(week);
}

export function toUtcIso(d = new Date()): string {
  return formatISO(d, { representation: "complete" });
}

export { formatISO, startOfMonth, startOfWeek };
