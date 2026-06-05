/**
 * 账号密码/Cookie 认证方式
 * 支持直接配置 Cookie 或通过登录获取 Cookie
 */

import type { AuthHandler, AuthParams, PasswordAuth } from '../types.js';

export function createPasswordAuth(config: PasswordAuth, baseUrl: string): AuthHandler {
  let cookie: string | null = config.cookie || null;
  let loginPromise: Promise<string> | null = null;

  async function login(): Promise<string> {
    const url = `${baseUrl}/api/user/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.username,
        password: config.password,
      }),
    });

    if (!res.ok) {
      throw new Error(`Yapi 登录失败: HTTP ${res.status}`);
    }

    const data = await res.json() as { errcode: number; errmsg: string };
    if (data.errcode !== 0) {
      throw new Error(`Yapi 登录失败: ${data.errmsg}`);
    }

    // 从 Set-Cookie 头提取 cookie
    const setCookies = res.headers.getSetCookie?.() || [];
    const cookieParts: string[] = [];
    for (const sc of setCookies) {
      const part = sc.split(';')[0];
      if (part) cookieParts.push(part);
    }

    if (cookieParts.length === 0) {
      throw new Error('Yapi 登录成功但未返回 Cookie');
    }

    return cookieParts.join('; ');
  }

  async function ensureCookie(): Promise<string> {
    if (cookie) return cookie;

    // 防止并发登录
    if (!loginPromise) {
      loginPromise = login().then((c) => {
        cookie = c;
        loginPromise = null;
        return c;
      }).catch((err) => {
        loginPromise = null;
        throw err;
      });
    }

    return loginPromise;
  }

  return {
    async getAuthParams(_projectId?: number): Promise<AuthParams> {
      const c = await ensureCookie();
      return { headers: { Cookie: c } };
    },
  };
}

/**
 * 清除已缓存的 Cookie（用于重新登录）
 */
export function createPasswordAuthWithRetry(config: PasswordAuth, baseUrl: string): AuthHandler & { resetCookie: () => void } {
  const handler = createPasswordAuth(config, baseUrl) as AuthHandler & { resetCookie: () => void };
  let innerCookie: string | null = config.cookie || null;

  // 暴露重置方法，在 401 时可调用
  handler.resetCookie = () => {
    innerCookie = null;
  };

  return handler;
}
