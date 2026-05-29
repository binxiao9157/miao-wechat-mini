import type { CatInfo, DiaryEntry, PointsInfo, TimeLetter } from '../storage';

export interface ServerSyncApi {
  syncCatToServer(userId: string, cat: CatInfo): Promise<void>;
  deleteCatFromServer(userId: string, catId: string): Promise<void>;
  syncDiaryToServer(userId: string, diary: DiaryEntry): Promise<void>;
  deleteDiaryFromServer(userId: string, diaryId: string): Promise<void>;
  syncLetterToServer(userId: string, letter: TimeLetter): Promise<void>;
  deleteLetterFromServer(userId: string, letterId: string): Promise<void>;
  syncPointsToServer(userId: string, data: PointsInfo): Promise<void>;
}
