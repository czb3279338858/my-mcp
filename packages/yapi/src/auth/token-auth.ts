/**
 * Project Token 认证方式
 * 将 token 以 query parameter 附加到请求
 */

import type { AuthHandler, AuthParams, ProjectTokensAuth } from '../types.js';

export function createTokenAuth(config: ProjectTokensAuth): AuthHandler {
  const tokenMap = new Map<number, string>();
  for (const item of config.tokens) {
    tokenMap.set(item.projectId, item.token);
  }

  return {
    async getAuthParams(projectId?: number): Promise<AuthParams> {
      if (projectId !== undefined) {
        const token = tokenMap.get(projectId);
        if (token) {
          return { queryParams: { token } };
        }
      }
      // 如果没指定 projectId 或找不到对应 token，使用第一个 token
      const firstToken = config.tokens[0]?.token;
      if (firstToken) {
        return { queryParams: { token: firstToken } };
      }
      return {};
    },
  };
}
