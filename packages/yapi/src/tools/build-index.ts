/**
 * build_index 工具
 * 构建或更新本地接口字段索引
 */

import { z } from 'zod';
import type { IndexManager } from '../indexer/index.js';

export const buildIndexSchema = z.object({
  mode: z.enum(['full', 'incremental']).optional().describe('构建模式: full（全量重建）或 incremental（增量更新，默认）'),
});

export type BuildIndexInput = z.infer<typeof buildIndexSchema>;

export async function buildIndex(indexManager: IndexManager, input: BuildIndexInput) {
  const mode = input.mode || 'incremental';

  if (indexManager.isBuilding()) {
    return {
      status: 'already_building',
      message: '索引正在构建中，请等待当前构建完成后再试',
    };
  }

  const result = mode === 'full'
    ? await indexManager.buildFull()
    : await indexManager.buildIncremental();

  return {
    status: 'success',
    mode,
    summary: {
      projectCount: result.projectCount,
      interfaceCount: result.interfaceCount,
      added: result.added,
      updated: result.updated,
      removed: result.removed,
      duration: `${(result.duration / 1000).toFixed(1)}s`,
    },
    message: `索引${mode === 'full' ? '全量重建' : '增量更新'}完成。共 ${result.projectCount} 个项目，${result.interfaceCount} 个接口。新增 ${result.added}，更新 ${result.updated}，删除 ${result.removed}。耗时 ${(result.duration / 1000).toFixed(1)}s。`,
  };
}
