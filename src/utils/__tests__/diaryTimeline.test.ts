import { describe, expect, it } from 'vitest';
import { processDiaryTimeline } from '../diaryTimeline';

type Entry = { id: string; createdAt: number };

const day = 24 * 60 * 60 * 1000;
const now = new Date('2026-06-05T12:00:00+08:00').getTime();

describe('diary timeline grouping', () => {
  it('groups recent diaries by day and older diaries by month', () => {
    const entries: Entry[] = [
      { id: 'older-2024', createdAt: new Date('2024-11-12T09:00:00+08:00').getTime() },
      { id: 'today-late', createdAt: now - 60 * 1000 },
      { id: 'yesterday', createdAt: now - day },
      { id: 'today-early', createdAt: now - 60 * 60 * 1000 },
      { id: 'older-2026', createdAt: new Date('2026-04-01T09:00:00+08:00').getTime() },
    ];

    const result = processDiaryTimeline(entries, now);

    expect(result.recentGroups).toEqual([
      {
        dateLabel: '今天',
        items: [
          { id: 'today-late', createdAt: now - 60 * 1000 },
          { id: 'today-early', createdAt: now - 60 * 60 * 1000 },
        ],
      },
      {
        dateLabel: '6月4日',
        items: [{ id: 'yesterday', createdAt: now - day }],
      },
    ]);

    expect(result.olderGroups).toEqual([
      {
        monthLabel: '2026年4月',
        items: [{ id: 'older-2026', createdAt: new Date('2026-04-01T09:00:00+08:00').getTime() }],
      },
      {
        monthLabel: '2024年11月',
        items: [{ id: 'older-2024', createdAt: new Date('2024-11-12T09:00:00+08:00').getTime() }],
      },
    ]);
  });

  it('treats entries at exactly 30 days old as recent', () => {
    const entries: Entry[] = [
      { id: 'boundary', createdAt: now - 30 * day },
      { id: 'older', createdAt: now - 30 * day - 1 },
    ];

    const result = processDiaryTimeline(entries, now);

    expect(result.recentGroups.flatMap(group => group.items.map(item => item.id))).toEqual(['boundary']);
    expect(result.olderGroups.flatMap(group => group.items.map(item => item.id))).toEqual(['older']);
  });
});
