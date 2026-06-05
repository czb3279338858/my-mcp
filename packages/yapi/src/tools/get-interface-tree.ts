/**
 * get_interface_tree 工具
 * 获取指定项目下的接口分类树及接口概览
 */

import { z } from 'zod';
import type { YapiClient } from '../client/index.js';

export const getInterfaceTreeSchema = z.object({
  project_id: z.number().describe('项目 ID（必填）'),
});

export type GetInterfaceTreeInput = z.infer<typeof getInterfaceTreeSchema>;

export async function getInterfaceTree(client: YapiClient, input: GetInterfaceTreeInput) {
  const categories = await client.getCategoryMenu(input.project_id);

  const tree = [];
  for (const cat of categories) {
    const result = await client.getInterfaceListByCat(cat._id);
    tree.push({
      categoryId: cat._id,
      categoryName: cat.name,
      categoryDesc: cat.desc,
      interfaces: result.list.map((i) => ({
        id: i._id,
        title: i.title,
        path: i.path,
        method: i.method,
        status: i.status,
      })),
    });
  }

  return { project_id: input.project_id, categories: tree };
}
