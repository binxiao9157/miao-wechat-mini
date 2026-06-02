import { ACTION_PROMPTS, VolcanoService } from './volcanoService';
import { FileManager } from './fileManager';
import type { CatInfo } from './storage';
import type { FourStageVideoAction } from './videoActions';

export type SecondaryUnlockCat = Pick<
  CatInfo,
  'id' | 'name' | 'breed' | 'color' | 'avatar' | 'source' | 'anchorFrame' | 'placeholderImage' | 'videoPaths'
>;
export type VideoLastFrameResolver = (videoUrl: string, fallbackFrame: string) => Promise<string>;

const SECONDARY_ACTIONS: FourStageVideoAction[] = ['v2_wait', 'v3_return', 'v4_fetch'];
const activeUnlockTasks = new Map<string, Promise<void>>();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function extractLastFrameInWeb(videoUrl: string, fallbackFrame: string): Promise<string> {
  if (typeof document === 'undefined') return fallbackFrame;

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const cleanup = () => {
      try {
        video.src = '';
        video.load();
      } catch {
        // noop
      }
    };
    const finish = (frame: string) => {
      clearTimeout(timeout);
      cleanup();
      resolve(frame);
    };
    const timeout = setTimeout(() => finish(fallbackFrame), 15000);

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    video.addEventListener('loadedmetadata', () => {
      try {
        video.currentTime = Math.max(0, video.duration - 0.1);
      } catch {
        finish(fallbackFrame);
      }
    });
    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 854;
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(fallbackFrame);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        finish(fallbackFrame);
      }
    });
    video.addEventListener('error', () => finish(fallbackFrame));
  });
}

let videoLastFrameResolver: VideoLastFrameResolver = extractLastFrameInWeb;

export function setSecondaryUnlockFrameResolverForTesting(resolver: VideoLastFrameResolver | null) {
  videoLastFrameResolver = resolver || extractLastFrameInWeb;
}

async function resolveLastFrame(videoUrl: string | undefined, fallbackFrame: string): Promise<string> {
  if (!videoUrl) return fallbackFrame;
  try {
    return await videoLastFrameResolver(videoUrl, fallbackFrame);
  } catch {
    return fallbackFrame;
  }
}

async function runSecondaryUnlock(cat: SecondaryUnlockCat, anchorImage?: string | null) {
  let completed = 0;
  let failed = 0;

  try {
    const anchorFrame = anchorImage || cat.anchorFrame || cat.placeholderImage || cat.avatar;
    const v1LastFrame = await resolveLastFrame(cat.videoPaths?.v1_approach, anchorFrame);
    let v2LastFrame = v1LastFrame;
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
        const actionFirstFrame = action === 'v2_wait' ? v1LastFrame : v2LastFrame;
        const actionLastFrame = action === 'v2_wait' ? v1LastFrame : anchorFrame;
        const task = await VolcanoService.submitTask(actionFirstFrame, {
          prompt: actionPrompt.prompt,
          duration: actionPrompt.duration,
          firstFrame: actionFirstFrame,
          lastFrame: actionLastFrame,
          hasLastFrame: true,
        });
        const videoUrl = await VolcanoService.pollTaskResult(task.id);
        if (action === 'v2_wait') {
          v2LastFrame = await resolveLastFrame(videoUrl, v1LastFrame);
        }
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
