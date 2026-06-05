/**
 * 配置加载模块
 * 支持从环境变量 YAPI_CONFIG 或 --config 参数加载配置
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';
import type { YapiConfig } from './types.js';

// ============ Zod Schema 定义 ============

const ProjectTokenItemSchema = z.object({
  projectId: z.number(),
  token: z.string(),
});

const ProjectTokensAuthSchema = z.object({
  type: z.literal('projectTokens'),
  tokens: z.array(ProjectTokenItemSchema).min(1),
});

const PasswordAuthSchema = z.object({
  type: z.literal('password'),
  username: z.string(),
  password: z.string(),
  cookie: z.string().optional(),
});

const AuthConfigSchema = z.discriminatedUnion('type', [
  ProjectTokensAuthSchema,
  PasswordAuthSchema,
]);

const YapiConfigSchema = z.object({
  baseUrl: z.string().url(),
  auth: AuthConfigSchema,
  timeout: z.number().positive().optional().default(10000),
  allowHttp: z.boolean().optional().default(false),
  indexPath: z.string().optional(),
  refreshCooldown: z.number().nonnegative().optional().default(300000),
});

// ============ 环境变量替换 ============

/**
 * 替换字符串中的 ${ENV_VAR} 为对应环境变量值
 */
function replaceEnvVars(text: string): string {
  return text.replace(/\$\{([^}]+)\}/g, (match, varName: string) => {
    const value = process.env[varName.trim()];
    if (value === undefined) {
      throw new Error(`环境变量 ${varName} 未定义`);
    }
    return value;
  });
}

// ============ 配置加载 ============

/**
 * 获取默认索引路径
 */
function getDefaultIndexPath(): string {
  return resolve(homedir(), '.yapi-mcp', 'cache', 'index.json');
}

/**
 * 从命令行参数中解析 --config 路径
 */
function getConfigPathFromArgs(): string | undefined {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf('--config');
  if (configIdx !== -1 && configIdx + 1 < args.length) {
    return args[configIdx + 1];
  }
  return undefined;
}

/**
 * 加载并解析配置
 */
export function loadConfig(): YapiConfig {
  let rawJson: string;

  // 优先从环境变量读取
  if (process.env.YAPI_CONFIG) {
    rawJson = process.env.YAPI_CONFIG;
  } else {
    // 从 --config 参数指定的文件读取
    const configPath = getConfigPathFromArgs();
    if (!configPath) {
      throw new Error(
        '未提供配置。请设置环境变量 YAPI_CONFIG（JSON 字符串）或使用 --config <path> 参数指定配置文件路径。'
      );
    }
    const resolvedPath = resolve(configPath);
    try {
      rawJson = readFileSync(resolvedPath, 'utf-8');
    } catch (err) {
      throw new Error(`无法读取配置文件: ${resolvedPath} - ${(err as Error).message}`);
    }
  }

  // 替换环境变量
  const processedJson = replaceEnvVars(rawJson);

  // 解析 JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(processedJson);
  } catch {
    throw new Error('配置 JSON 解析失败，请检查格式是否正确');
  }

  // 校验配置结构
  const result = YapiConfigSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues
      .map((i: { path: (string | number)[]; message: string }) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`配置校验失败:\n${errors}`);
  }

  const config = result.data;

  // 安全检查: 非 HTTPS 需要 allowHttp
  if (!config.allowHttp && !config.baseUrl.startsWith('https://')) {
    throw new Error(
      `baseUrl "${config.baseUrl}" 使用了非 HTTPS 协议。如需允许，请设置 allowHttp: true`
    );
  }

  // 设置默认 indexPath
  if (!config.indexPath) {
    config.indexPath = getDefaultIndexPath();
  } else {
    config.indexPath = resolve(config.indexPath.replace(/^~/, homedir()));
  }

  return config as YapiConfig;
}
