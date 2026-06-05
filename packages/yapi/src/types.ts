/**
 * Yapi MCP Server 全局类型定义
 */

// ============ 认证配置类型 ============

export interface ProjectTokenItem {
  projectId: number;
  token: string;
}

export interface ProjectTokensAuth {
  type: 'projectTokens';
  tokens: ProjectTokenItem[];
}

export interface PasswordAuth {
  type: 'password';
  username: string;
  password: string;
  /** 可选，直接提供 Cookie 跳过登录 */
  cookie?: string;
}

export type AuthConfig = ProjectTokensAuth | PasswordAuth;

// ============ 服务器配置类型 ============

export interface YapiConfig {
  /** Yapi 服务地址，如 https://yapi.company.com */
  baseUrl: string;
  /** 认证配置 */
  auth: AuthConfig;
  /** 请求超时时间(ms)，默认 10000 */
  timeout?: number;
  /** 是否允许 HTTP 连接（非 HTTPS），默认 false */
  allowHttp?: boolean;
  /** 索引文件存储路径，默认 ~/.yapi-mcp/cache/index.json */
  indexPath?: string;
  /** 搜索前自动刷新冷却时间(ms)，默认 300000（5分钟） */
  refreshCooldown?: number;
}

// ============ 认证处理器接口 ============

export interface AuthParams {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
}

export interface AuthHandler {
  /** 获取认证参数（headers 或 query params） */
  getAuthParams(projectId?: number): Promise<AuthParams>;
}

// ============ 索引相关类型 ============

export interface IndexedField {
  /** 字段名 */
  name: string;
  /** 字段描述/备注 */
  desc: string;
  /** 字段位置: query/body/header */
  in: string;
}

export interface IndexedInterface {
  id: number;
  title: string;
  path: string;
  method: string;
  projectId: number;
  projectName: string;
  catName: string;
  /** 接口更新时间戳 */
  upTime: number;
  /** 请求字段 */
  reqFields: IndexedField[];
  /** 响应字段 */
  resFields: IndexedField[];
}

export interface IndexData {
  version: number;
  lastFullBuild: string | null;
  lastCheck: string | null;
  projects: Record<string, {
    name: string;
    interfaces: IndexedInterface[];
  }>;
}
