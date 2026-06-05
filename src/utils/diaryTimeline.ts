export interface TimelineEntry {
  createdAt: number;
}

export interface RecentTimelineGroup<T extends TimelineEntry> {
  dateLabel: string;
  items: T[];
}

export interface OlderTimelineGroup<T extends TimelineEntry> {
  monthLabel: string;
  items: T[];
}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDiaryTimelineDate(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  if (isSameLocalDay(date, new Date(now))) return '今天';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatDiaryTimelineMonth(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function processDiaryTimeline<T extends TimelineEntry>(entries: T[], now = Date.now()) {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  const recentGroups: RecentTimelineGroup<T>[] = [];
  const olderGroups: OlderTimelineGroup<T>[] = [];
  const recentMap = new Map<string, T[]>();
  const olderMap = new Map<string, T[]>();

  for (const entry of sorted) {
    if (now - entry.createdAt <= ONE_MONTH_MS) {
      const label = formatDiaryTimelineDate(entry.createdAt, now);
      recentMap.set(label, [...(recentMap.get(label) || []), entry]);
    } else {
      const label = formatDiaryTimelineMonth(entry.createdAt);
      olderMap.set(label, [...(olderMap.get(label) || []), entry]);
    }
  }

  recentMap.forEach((items, dateLabel) => recentGroups.push({ dateLabel, items }));
  olderMap.forEach((items, monthLabel) => olderGroups.push({ monthLabel, items }));

  return { recentGroups, olderGroups };
}
