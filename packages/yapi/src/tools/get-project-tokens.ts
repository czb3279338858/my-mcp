/**
 * get_project_tokens 工具
 * 获取所有有权限项目的 Token，生成配置片段
 * 仅在使用 password 认证方式时可用
 */

import { z } from 'zod';
import type { YapiClient } from '../client/index.js';
import type { AuthConfig } from '../types.js';

export const getProjectTokensSchema = z.object({});

export type GetProjectTokensInput = z.infer<typeof getProjectTokensSchema>;

export async function getProjectTokens(client: YapiClient, authConfig: AuthConfig) {
  if (authConfig.type !== 'password') {
    return {
      error: '此工具仅在使用 password 认证方式时可用。projectTokens 认证方式下不需要此工具，Token 已在配置中。',
    };
  }

  const projects = await client.getAllProjects();
  const tokenResults: Array<{
    project_id: number;
    project_name: string;
    token: string;
  }> = [];

  for (const project of projects) {
    try {
      const token = await client.getProjectToken(project._id);
      tokenResults.push({
        project_id: project._id,
        project_name: project.name,
        token,
      });
    } catch {
      // 跳过无权限获取 token 的项目
    }
  }

  // 生成配置片段
  const configSnippet = {
    auth: {
      type: 'projectTokens',
      tokens: tokenResults.map((t) => ({
        projectId: t.project_id,
        token: t.token,
      })),
    },
  };

  return {
    total: tokenResults.length,
    projectTokens: tokenResults,
    configSnippet: JSON.stringify(configSnippet, null, 2),
    hint: '请将上方 configSnippet 中的 auth 部分复制到您的配置文件中，替换当前的 password 认证配置。',
  };
}
