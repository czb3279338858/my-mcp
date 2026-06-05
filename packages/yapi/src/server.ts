/**
 * MCP Server 初始化与工具注册
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { YapiClient } from './client/index.js';
import type { IndexManager } from './indexer/index.js';
import type { YapiConfig } from './types.js';

import { listProjectsSchema, listProjects } from './tools/list-projects.js';
import { getInterfaceTreeSchema, getInterfaceTree } from './tools/get-interface-tree.js';
import { getInterfaceDetailSchema, getInterfaceDetail } from './tools/get-interface-detail.js';
import { searchInterfacesSchema, searchInterfaces } from './tools/search-interfaces.js';
import { searchInterfacesByFieldSchema, searchInterfacesByField } from './tools/search-interfaces-by-field.js';
import { getProjectTokensSchema, getProjectTokens } from './tools/get-project-tokens.js';
import { buildIndexSchema, buildIndex } from './tools/build-index.js';

export function createMcpServer(
  client: YapiClient,
  indexManager: IndexManager,
  config: YapiConfig
): McpServer {
  const server = new McpServer({
    name: 'yapi-plus-mcp-server',
    version: '1.0.0',
  });

  // 注册 list_projects 工具
  server.tool(
    'list_projects',
    '获取当前认证用户有权访问的 Yapi 项目列表，返回项目 ID、名称、描述等信息',
    listProjectsSchema.shape,
    async (input) => {
      try {
        const result = await listProjects(client, input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `错误: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  // 注册 get_interface_tree 工具
  server.tool(
    'get_interface_tree',
    '获取指定项目下的接口分类树及接口概览，包含分类名称和各分类下的接口列表（ID、标题、路径、方法）',
    getInterfaceTreeSchema.shape,
    async (input) => {
      try {
        const result = await getInterfaceTree(client, input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `错误: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  // 注册 get_interface_detail 工具
  server.tool(
    'get_interface_detail',
    '获取指定接口的完整定义，包括请求参数（Query/Header/Body）、响应参数、字段类型和说明。支持通过 interface_id 或 project_id+path+method 查询',
    getInterfaceDetailSchema.shape,
    async (input) => {
      try {
        const result = await getInterfaceDetail(client, input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `错误: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  // 注册 search_interfaces 工具
  server.tool(
    'search_interfaces',
    '通过关键词搜索接口，匹配接口路径、名称和描述。可限定项目范围或全局搜索',
    searchInterfacesSchema.shape,
    async (input) => {
      try {
        const result = await searchInterfaces(client, input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `错误: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  // 注册 search_interfaces_by_field 工具
  server.tool(
    'search_interfaces_by_field',
    '根据请求/响应中的字段名称或备注搜索接口。依赖本地索引，首次使用请先调用 build_index。支持搜索请求字段、响应字段或两者',
    searchInterfacesByFieldSchema.shape,
    async (input) => {
      try {
        const result = await searchInterfacesByField(indexManager, input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `错误: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  // 注册 get_project_tokens 工具
  server.tool(
    'get_project_tokens',
    '获取所有有权限项目的 Token，生成可直接粘贴进配置文件的 JSON 片段。仅在使用账号密码认证时可用',
    getProjectTokensSchema.shape,
    async () => {
      try {
        const result = await getProjectTokens(client, config.auth);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `错误: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  // 注册 build_index 工具
  server.tool(
    'build_index',
    '构建或更新本地接口字段索引，用于 search_interfaces_by_field 的数据源。支持全量重建(full)和增量更新(incremental)两种模式',
    buildIndexSchema.shape,
    async (input) => {
      try {
        const result = await buildIndex(indexManager, input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `错误: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  return server;
}
