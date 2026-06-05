#!/usr/bin/env node
/**
 * Yapi MCP Server 入口
 * 加载配置 → 初始化认证 → 启动 stdio transport
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { createAuthHandler } from './auth/index.js';
import { YapiClient } from './client/index.js';
import { IndexManager } from './indexer/index.js';
import { createMcpServer } from './server.js';

async function main() {
  try {
    // 加载配置
    const config = loadConfig();

    // 初始化认证
    const authHandler = createAuthHandler(config.auth, config.baseUrl);

    // 初始化 API 客户端
    const client = new YapiClient({
      baseUrl: config.baseUrl,
      authHandler,
      timeout: config.timeout || 10000,
    });

    // 初始化索引管理器
    const indexManager = new IndexManager({
      indexPath: config.indexPath!,
      refreshCooldown: config.refreshCooldown || 300000,
      client,
    });

    // 尝试加载已有索引
    indexManager.loadIndex();

    // 创建 MCP Server
    const server = createMcpServer(client, indexManager, config);

    // 启动 stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (err) {
    console.error(`[yapi-plus-mcp-server] 启动失败: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
