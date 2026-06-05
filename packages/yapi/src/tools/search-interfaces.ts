/**
 * search_interfaces 工具
 * 通过关键词搜索接口
 */

import { z } from 'zod';
import type { YapiClient } from '../client/index.js';

export const searchInterfacesSchema = z.object({
  keyword: z.string().describe('搜索关键词（匹配路径、名称、描述）'),
  project_id: z.number().optional().describe('限定项目 ID（可选）'),
  limit: z.number().optional().describe('返回数量限制，默认 20'),
  offset: z.number().optional().describe('偏移量，默认 0'),
});

export type SearchInterfacesInput = z.infer<typeof searchInterfacesSchema>;

export async function searchInterfaces(client: YapiClient, input: SearchInterfacesInput) {
  const limit = input.limit || 20;
  const offset = input.offset || 0;

  if (input.project_id) {
    // 在指定项目中搜索
    const results = await client.searchInterface(input.project_id, input.keyword);
    const paged = results.slice(offset, offset + limit);

    return {
      total: results.length,
      offset,
      limit,
      interfaces: paged.map((i) => ({
        id: i._id,
        title: i.title,
        path: i.path,
        method: i.method,
        projectId: i.project_id,
      })),
    };
  }

  // 全局搜索：遍历所有项目
  const projects = await client.getAllProjects();
  const allResults: Array<{
    id: number;
    title: string;
    path: string;
    method: string;
    projectId: number;
    projectName: string;
  }> = [];

  for (const project of projects) {
    try {
      const results = await client.searchInterface(project._id, input.keyword);
      for (const r of results) {
        allResults.push({
          id: r._id,
          title: r.title,
          path: r.path,
          method: r.method,
          projectId: project._id,
          projectName: project.name,
        });
      }
    } catch { /* 跳过搜索失败的项目 */ }
  }

  const paged = allResults.slice(offset, offset + limit);

  return {
    total: allResults.length,
    offset,
    limit,
    interfaces: paged,
  };
}
