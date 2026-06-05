/**
 * search_interfaces_by_field 工具
 * 根据字段名/备注搜索包含该字段的接口
 * 依赖本地索引，搜索前自动增量检查
 */

import { z } from 'zod';
import type { IndexManager } from '../indexer/index.js';

export const searchInterfacesByFieldSchema = z.object({
  field_name: z.string().describe('字段名或备注关键词（必填）'),
  search_in: z.enum(['request', 'response', 'both']).optional().describe('搜索范围: request/response/both，默认 both'),
  project_id: z.number().optional().describe('限定项目 ID（可选）'),
  limit: z.number().optional().describe('返回数量限制，默认 50'),
  offset: z.number().optional().describe('偏移量，默认 0'),
});

export type SearchInterfacesByFieldInput = z.infer<typeof searchInterfacesByFieldSchema>;

export async function searchInterfacesByField(
  indexManager: IndexManager,
  input: SearchInterfacesByFieldInput
) {
  // 检查索引是否存在
  if (!indexManager.hasIndex()) {
    if (indexManager.isBuilding()) {
      return {
        status: 'indexing',
        message: '索引正在构建中，请等待 build_index 完成后重试',
      };
    }
    return {
      status: 'no_index',
      message: '本地索引不存在，请先调用 build_index 工具构建索引后再进行字段搜索',
    };
  }

  // 检查是否正在构建
  if (indexManager.isBuilding()) {
    return {
      status: 'indexing',
      message: '索引正在更新中，使用当前已有索引进行搜索（结果可能不是最新）',
      results: doSearch(indexManager, input),
    };
  }

  // 自动刷新检查
  try {
    const refreshResult = await indexManager.autoRefresh();
    if (refreshResult) {
      // 刷新完成后搜索
    }
  } catch {
    // 刷新失败不影响搜索，使用现有索引
  }

  return {
    status: 'ok',
    ...doSearch(indexManager, input),
  };
}

function doSearch(indexManager: IndexManager, input: SearchInterfacesByFieldInput) {
  const searchIn = input.search_in || 'both';
  const limit = input.limit || 50;
  const offset = input.offset || 0;

  const results = indexManager.searchByField(input.field_name, searchIn, input.project_id);
  const paged = results.slice(offset, offset + limit);

  return {
    total: results.length,
    offset,
    limit,
    interfaces: paged.map((r) => ({
      interfaceId: r.interfaceId,
      title: r.title,
      path: r.path,
      method: r.method,
      projectId: r.projectId,
      projectName: r.projectName,
      catName: r.catName,
      matchedFields: r.matchedFields,
    })),
  };
}
