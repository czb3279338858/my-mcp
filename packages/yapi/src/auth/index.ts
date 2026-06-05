/**
 * 认证管理器
 * 根据配置类型创建对应的认证处理器
 */

import type { AuthConfig, AuthHandler } from '../types.js';
import { createTokenAuth } from './token-auth.js';
import { createPasswordAuth } from './password-auth.js';

export function createAuthHandler(config: AuthConfig, baseUrl: string): AuthHandler {
  switch (config.type) {
    case 'projectTokens':
      return createTokenAuth(config);
    case 'password':
      return createPasswordAuth(config, baseUrl);
    default:
      throw new Error(`不支持的认证类型: ${(config as { type: string }).type}`);
  }
}

export { createTokenAuth } from './token-auth.js';
export { createPasswordAuth } from './password-auth.js';
