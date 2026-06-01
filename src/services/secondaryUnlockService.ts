import { ACTION_PROMPTS, VolcanoService } from './volcanoService';
import { FileManager } from './fileManager';
import type { CatInfo } from './storage';
import type { FourStageVideoAction } from './videoActions';

export type SecondaryUnlockCat = Pick<
  CatInfo,
  'id' | 'name' | 'breed' | 'color' | 'avatar' | 'source' | 'anchorFrame' | 'placeholderImage'
>;

const SECONDARY_ACTIONS: FourStageVideoAction[] = ['v2_wait', 'v3_return', 'v4_fetch'];
const activeUnlockTasks = new Map<string, Promise<void>>();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSecondaryUnlock(cat: SecondaryUnlockCat, anchorImage?: string | null) {
  let completed = 0;
  let failed = 0;

  try {
    const anchorFrame = anchorImage || cat.anchorFrame || cat.placeholderImage || cat.avatar;
    await FileManager.updateCatVideos(cat.id, {}, true, {
      completed,
      total: SECONDARY_ACTIONS.length,
      currentAction: SECONDARY_ACTIONS[0],
      failed,
    });

    for (const action of SECONDARY_ACTIONS) {
      try {
        await FileManager.updateCatVideos(cat.id, {}, true, {
          completed,
          total: SECONDARY_ACTIONS.length,
          currentAction: action,
          failed,
        });

        const actionPrompt = ACTION_PROMPTS[action];
        const task = await VolcanoService.submitTask(anchorFrame, {
          prompt: actionPrompt.prompt,
          duration: actionPrompt.duration,
          firstFrame: anchorFrame,
          lastFrame: anchorFrame,
          hasLastFrame: action === 'v2_wait',
        });
        const videoUrl = await VolcanoService.pollTaskResult(task.id);
        completed += 1;

        await FileManager.updateCatVideos(cat.id, { [action]: videoUrl }, true, {
          completed,
          total: SECONDARY_ACTIONS.length,
          currentAction: action,
          failed,
        }, { actionGenerationError: failed > 0 ? `有 ${failed} 个后续动作暂未生成成功` : null });

        await delay(3000);
      } catch (error) {
        failed += 1;
        await FileManager.updateCatVideos(cat.id, {}, true, {
          completed,
          total: SECONDARY_ACTIONS.length,
          currentAction: action,
          failed,
        }, { actionGenerationError: `有 ${failed} 个后续动作暂未生成成功` });
        console.error(`[SecondaryUnlockService] action ${action} failed:`, error);
      }
    }

    await FileManager.updateCatVideos(cat.id, {}, false, undefined, {
      actionGenerationError: failed > 0 ? `有 ${failed} 个后续动作暂未生成成功` : null,
    });
  } catch (error) {
    console.error('[SecondaryUnlockService] background unlock failed:', error);
    await FileManager.updateCatVideos(cat.id, {}, false, undefined, {
      actionGenerationError: '后续动作生成失败，稍后可重试',
    });
  }
}

export function startSecondaryUnlock(cat: SecondaryUnlockCat, anchorImage?: string | null): Promise<void> {
  const activeTask = activeUnlockTasks.get(cat.id);
  if (activeTask) return activeTask;

  const task = runSecondaryUnlock(cat, anchorImage).finally(() => {
    activeUnlockTasks.delete(cat.id);
  });
  activeUnlockTasks.set(cat.id, task);
  return task;
}

export function isSecondaryUnlockRunning(catId: string): boolean {
  return activeUnlockTasks.has(catId);
}
