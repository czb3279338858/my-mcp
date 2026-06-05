# yapi-plus-mcp

Yapi Plus MCP Server —— 基于 Yapi MCP 的增强扩展，让 AI 助手更高效地访问 Yapi API 管理平台的接口数据。

符合 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 标准，可与任意 MCP 客户端（如 Cursor、Qoder、Claude Desktop 等）配合使用。

## 功能

- **list_projects** - 获取有权访问的项目列表
- **get_interface_tree** - 获取项目下的接口分类树
- **get_interface_detail** - 获取接口完整定义（请求/响应参数、字段类型、说明）
- **search_interfaces** - 关键词搜索接口（路径、名称、描述）
- **search_interfaces_by_field** - 按字段名/备注搜索接口（依赖本地索引）
- **build_index** - 构建/更新本地接口字段索引（全量或增量）
- **get_project_tokens** - 一键获取所有项目 Token 并生成配置片段

## 环境要求

- Node.js >= 18.0.0

## 安装

```bash
npm install -g yapi-plus-mcp
```

或作为项目依赖：

```bash
npm install yapi-plus-mcp
```

## 配置

### 方式一：环境变量（推荐）

设置 `YAPI_CONFIG` 环境变量为 JSON 字符串：

```bash
export YAPI_CONFIG='{"baseUrl":"https://yapi.company.com","auth":{"type":"password","username":"admin","password":"your-password"}}'
```

### 方式二：配置文件

```bash
yapi-plus-mcp-server --config /path/to/config.json
```

### 配置结构

```json
{
  "baseUrl": "https://yapi.company.com",
  "auth": {
    "type": "projectTokens",
    "tokens": [
      { "projectId": 11, "token": "your-token-here" },
      { "projectId": 12, "token": "another-token" }
    ]
  },
  "timeout": 10000,
  "allowHttp": false,
  "indexPath": "~/.yapi-mcp/cache/index.json",
  "refreshCooldown": 300000
}
```

### 配置项说明

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `baseUrl` | string | 是 | - | Yapi 服务地址 |
| `auth` | object | 是 | - | 认证配置，见下方 |
| `timeout` | number | 否 | 10000 | 请求超时时间（ms） |
| `allowHttp` | boolean | 否 | false | 是否允许非 HTTPS 连接 |
| `indexPath` | string | 否 | ~/.yapi-mcp/cache/index.json | 本地索引文件路径 |
| `refreshCooldown` | number | 否 | 300000 | 搜索前自动刷新冷却时间（ms），默认5分钟 |

### 认证方式

#### 1. Project Tokens（推荐生产使用）

```json
{
  "auth": {
    "type": "projectTokens",
    "tokens": [
      { "projectId": 11, "token": "${YAPI_TOKEN_11}" }
    ]
  }
}
```

#### 2. 账号密码

```json
{
  "auth": {
    "type": "password",
    "username": "your-email",
    "password": "${YAPI_PASSWORD}",
    "cookie": ""
  }
}
```

> 支持 `${ENV_VAR}` 语法引用环境变量，避免明文存储敏感信息。

## MCP 客户端配置示例

### Cursor / Qoder

在 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "yapi": {
      "command": "npx",
      "args": ["-y", "yapi-plus-mcp"],
      "env": {
        "YAPI_CONFIG": "{\"baseUrl\":\"https://yapi.company.com\",\"auth\":{\"type\":\"password\",\"username\":\"admin\",\"password\":\"your-password\"}}"
      }
    }
  }
}
```

### 使用配置文件

```json
{
  "mcpServers": {
    "yapi": {
      "command": "npx",
      "args": ["-y", "yapi-plus-mcp", "--config", "/path/to/yapi-config.json"]
    }
  }
}
```

## 使用场景

### 查询接口参数

> "帮我查一下用户登录接口的请求参数和返回结构"

AI 会调用 `search_interfaces` 搜索，再通过 `get_interface_detail` 获取完整定义。

### 字段级搜索

> "找出所有请求参数中包含 userId 字段的接口"

AI 会调用 `search_interfaces_by_field`，若索引不存在会先调用 `build_index`。

### 浏览项目结构

> "列出订单模块的所有接口"

AI 会调用 `get_interface_tree` 获取分类树。

### 获取项目 Token

> "帮我获取所有项目的 Token 生成配置"

AI 会调用 `get_project_tokens`（需 password 认证方式）。

## 索引机制

`search_interfaces_by_field` 依赖本地持久化索引（JSON 文件）：

1. **首次使用**：需调用 `build_index` 全量构建索引
2. **自动保鲜**：搜索时若距上次检查超过 `refreshCooldown`（默认5分钟），自动增量检查更新
3. **增量更新**：对比每个接口的 `up_time`，仅拉取有变更的接口详情
4. **跨会话复用**：索引文件持久化在磁盘，重启后无需重建

## 开发

```bash
# 克隆仓库
git clone <repo-url>
cd my-mcp

# 安装依赖
npm install

# 编译
cd packages/yapi
npm run build

# 开发模式（监听变更）
npm run dev
```

## 许可证

MIT
