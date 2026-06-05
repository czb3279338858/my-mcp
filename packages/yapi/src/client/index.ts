/**
 * Yapi HTTP API 客户端
 * 封装所有与 Yapi REST API 的交互
 */

import type { AuthHandler } from '../types.js';
import type {
  YapiResponse,
  YapiProjectListItem,
  YapiCategory,
  YapiInterfaceListItem,
  YapiInterfaceDetail,
  YapiSearchResult,
  YapiProjectToken,
  YapiGroup,
} from './types.js';

export interface YapiClientOptions {
  baseUrl: string;
  authHandler: AuthHandler;
  timeout: number;
}

export class YapiClient {
  private baseUrl: string;
  private authHandler: AuthHandler;
  private timeout: number;

  constructor(options: YapiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.authHandler = options.authHandler;
    this.timeout = options.timeout;
  }

  /**
   * 发送请求到 Yapi API
   */
  private async request<T>(
    path: string,
    options: {
      method?: string;
      projectId?: number;
      params?: Record<string, string | number | undefined>;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const { method = 'GET', projectId, params = {}, body } = options;

    // 获取认证参数
    const authParams = await this.authHandler.getAuthParams(projectId);

    // 构建 URL
    const url = new URL(`${this.baseUrl}${path}`);

    // 附加认证 query params
    if (authParams.queryParams) {
      for (const [key, value] of Object.entries(authParams.queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    // 附加请求参数
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    // 构建 headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authParams.headers,
    };

    // 超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Yapi API 请求失败: ${method} ${path} - HTTP ${res.status}`);
      }

      const data = await res.json() as YapiResponse<T>;

      if (data.errcode !== 0) {
        throw new Error(`Yapi API 错误: ${data.errmsg} (code: ${data.errcode})`);
      }

      return data.data;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error(`Yapi API 请求超时: ${method} ${path} (${this.timeout}ms)`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ============ 分组相关 ============

  /**
   * 获取用户所在的分组列表
   */
  async getGroupList(): Promise<YapiGroup[]> {
    return this.request<YapiGroup[]>('/api/group/list');
  }

  // ============ 项目相关 ============

  /**
   * 获取指定分组下的项目列表
   */
  async getProjectList(groupId: number, page = 1, limit = 100): Promise<{
    count: number;
    total: number;
    list: YapiProjectListItem[];
  }> {
    return this.request('/api/project/list', {
      params: { group_id: groupId, page, limit },
    });
  }

  /**
   * 获取所有分组下所有项目
   */
  async getAllProjects(): Promise<YapiProjectListItem[]> {
    const groups = await this.getGroupList();
    const allProjects: YapiProjectListItem[] = [];

    for (const group of groups) {
      let page = 1;
      const limit = 100;
      while (true) {
        const result = await this.getProjectList(group._id, page, limit);
        allProjects.push(...result.list);
        if (allProjects.length >= result.total || result.list.length < limit) {
          break;
        }
        page++;
      }
    }

    return allProjects;
  }

  // ============ 分类相关 ============

  /**
   * 获取项目下的接口分类列表
   */
  async getCategoryMenu(projectId: number): Promise<YapiCategory[]> {
    return this.request<YapiCategory[]>('/api/interface/getCatMenu', {
      projectId,
      params: { project_id: projectId },
    });
  }

  // ============ 接口相关 ============

  /**
   * 获取分类下的接口列表
   */
  async getInterfaceListByCat(catId: number, page = 1, limit = 1000): Promise<{
    count: number;
    total: number;
    list: YapiInterfaceListItem[];
  }> {
    return this.request('/api/interface/list_cat', {
      params: { catid: catId, page, limit },
    });
  }

  /**
   * 获取项目下所有接口列表（遍历所有分类）
   */
  async getAllInterfacesByProject(projectId: number): Promise<YapiInterfaceListItem[]> {
    const categories = await this.getCategoryMenu(projectId);
    const allInterfaces: YapiInterfaceListItem[] = [];

    for (const cat of categories) {
      const result = await this.getInterfaceListByCat(cat._id);
      allInterfaces.push(...result.list);
    }

    return allInterfaces;
  }

  /**
   * 获取接口详情
   */
  async getInterfaceDetail(interfaceId: number): Promise<YapiInterfaceDetail> {
    return this.request<YapiInterfaceDetail>('/api/interface/get', {
      params: { id: interfaceId },
    });
  }

  // ============ 搜索相关 ============

  /**
   * 在项目中搜索接口
   */
  async searchInterface(projectId: number, keyword: string): Promise<YapiSearchResult[]> {
    const result = await this.request<{ interface: YapiSearchResult[] }>('/api/project/search', {
      params: { project_id: projectId, q: keyword },
    });
    return result.interface || [];
  }

  // ============ Token 相关 ============

  /**
   * 获取项目 Token
   */
  async getProjectToken(projectId: number): Promise<string> {
    const result = await this.request<YapiProjectToken>('/api/project/token', {
      projectId,
      params: { project_id: projectId },
    });
    return result.token;
  }
}
