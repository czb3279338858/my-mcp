/**
 * get_interface_detail 工具
 * 获取指定接口的完整定义
 */

import { z } from 'zod';
import type { YapiClient } from '../client/index.js';

export const getInterfaceDetailSchema = z.object({
  interface_id: z.number().optional().describe('接口 ID（与 project_id+path+method 二选一）'),
  project_id: z.number().optional().describe('项目 ID（配合 path 和 method 使用）'),
  path: z.string().optional().describe('接口路径（配合 project_id 和 method 使用）'),
  method: z.string().optional().describe('请求方法（配合 project_id 和 path 使用）'),
});

export type GetInterfaceDetailInput = z.infer<typeof getInterfaceDetailSchema>;

export async function getInterfaceDetail(client: YapiClient, input: GetInterfaceDetailInput) {
  let interfaceId = input.interface_id;

  // 如果没有直接提供 interface_id，通过 project_id + path + method 查找
  if (!interfaceId) {
    if (!input.project_id || !input.path || !input.method) {
      throw new Error('请提供 interface_id，或同时提供 project_id、path 和 method');
    }

    // 搜索匹配的接口
    const interfaces = await client.getAllInterfacesByProject(input.project_id);
    const matched = interfaces.find(
      (i) => i.path === input.path && i.method.toUpperCase() === input.method!.toUpperCase()
    );

    if (!matched) {
      throw new Error(`未找到匹配的接口: ${input.method!.toUpperCase()} ${input.path}`);
    }

    interfaceId = matched._id;
  }

  const detail = await client.getInterfaceDetail(interfaceId);

  // 解析 JSON Schema 格式的 body
  let reqBodySchema = null;
  if (detail.req_body_other && detail.req_body_is_json_schema) {
    try {
      reqBodySchema = JSON.parse(detail.req_body_other);
    } catch { /* ignore */ }
  }

  let resBodySchema = null;
  if (detail.res_body && detail.res_body_is_json_schema) {
    try {
      resBodySchema = JSON.parse(detail.res_body);
    } catch { /* ignore */ }
  }

  return {
    id: detail._id,
    title: detail.title,
    path: detail.path,
    method: detail.method,
    status: detail.status,
    tags: detail.tag,
    description: detail.desc,
    markdown: detail.markdown,
    updateTime: new Date(detail.up_time * 1000).toISOString(),
    createTime: new Date(detail.add_time * 1000).toISOString(),
    author: detail.username,
    request: {
      query: detail.req_query?.map((q) => ({
        name: q.name,
        required: q.required === '1',
        desc: q.desc,
        example: q.example,
      })) || [],
      headers: detail.req_headers?.map((h) => ({
        name: h.name,
        value: h.value,
        required: h.required === '1',
        desc: h.desc,
      })) || [],
      pathParams: detail.req_params?.map((p) => ({
        name: p.name,
        desc: p.desc,
        example: p.example,
      })) || [],
      bodyType: detail.req_body_type,
      bodyForm: detail.req_body_form?.map((f) => ({
        name: f.name,
        type: f.type,
        required: f.required === '1',
        desc: f.desc,
        example: f.example,
      })) || [],
      bodyJsonSchema: reqBodySchema,
    },
    response: {
      bodyType: detail.res_body_type,
      bodyJsonSchema: resBodySchema,
    },
  };
}
