export type ChecklistPeriodType = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export const WEEKDAY_RULES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type WeekdayRule = typeof WEEKDAY_RULES[number];

export interface ChecklistItem {
  id: string;
  title: string;
  periodType: ChecklistPeriodType;
  periodRule?: string;
  buildingId: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
}

export interface ChecklistCompletion {
  itemId: string;
  periodKey: string;
  checkedAt: string;
  checkedById: string;
  updatedAt: string;
}

export type ChecklistSnapshot = {
  items: ChecklistItem[];
  completions: ChecklistCompletion[];
};

export function isWeeklyDueToday(item: ChecklistItem, now = new Date()): boolean {
  if (item.periodType !== "WEEKLY") return true;
  const rule = item.periodRule?.toUpperCase();
  if (!rule) return true;
  const byDay = new Map<string, number>([
    ["SUN", 0],
    ["MON", 1],
    ["TUE", 2],
    ["WED", 3],
    ["THU", 4],
    ["FRI", 5],
    ["SAT", 6],
  ]);
  return byDay.get(rule) === now.getDay();
}
