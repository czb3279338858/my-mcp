/**
 * list_projects 工具
 * 获取当前认证用户有权访问的项目列表
 */

import { z } from 'zod';
import type { YapiClient } from '../client/index.js';

export const listProjectsSchema = z.object({
  limit: z.number().optional().describe('每页数量，默认 100'),
  offset: z.number().optional().describe('偏移量，默认 0'),
});

export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

export async function listProjects(client: YapiClient, input: ListProjectsInput) {
  const projects = await client.getAllProjects();

  // 简单分页
  const offset = input.offset || 0;
  const limit = input.limit || 100;
  const paged = projects.slice(offset, offset + limit);

  return {
    total: projects.length,
    offset,
    limit,
    projects: paged.map((p) => ({
      id: p._id,
      name: p.name,
      desc: p.desc,
      basepath: p.basepath,
      updateTime: new Date(p.up_time * 1000).toISOString(),
    })),
  };
}
