/**
 * Yapi API 响应类型定义
 */

// ============ 通用响应包装 ============

export interface YapiResponse<T> {
  errcode: number;
  errmsg: string;
  data: T;
}

// ============ 项目相关 ============

export interface YapiProject {
  _id: number;
  name: string;
  desc: string;
  basepath: string;
  up_time: number;
  add_time: number;
  env: Array<{ name: string; domain: string }>;
  members: Array<{ uid: number; role: string; username: string }>;
  uid: number;
  group_id: number;
  icon: string;
  color: string;
  is_json5: boolean;
}

export interface YapiProjectListItem {
  _id: number;
  name: string;
  desc: string;
  basepath: string;
  up_time: number;
  uid: number;
  group_id: number;
}

// ============ 分类相关 ============

export interface YapiCategory {
  _id: number;
  name: string;
  desc: string;
  index: number;
  add_time: number;
  up_time: number;
  project_id: number;
}

// ============ 接口列表项 ============

export interface YapiInterfaceListItem {
  _id: number;
  title: string;
  path: string;
  method: string;
  status: string;
  catid: number;
  uid: number;
  add_time: number;
  up_time: number;
  project_id: number;
}

// ============ 接口详情 ============

export interface YapiQueryParam {
  name: string;
  required: string; // "0" | "1"
  desc: string;
  example: string;
}

export interface YapiHeader {
  name: string;
  value: string;
  required: string;
  desc: string;
}

export interface YapiBodyFormItem {
  name: string;
  type: string;
  required: string;
  desc: string;
  example: string;
}

export interface YapiJsonSchemaProperty {
  type?: string;
  description?: string;
  properties?: Record<string, YapiJsonSchemaProperty>;
  items?: YapiJsonSchemaProperty;
  required?: string[];
  [key: string]: unknown;
}

export interface YapiJsonSchema {
  type?: string;
  properties?: Record<string, YapiJsonSchemaProperty>;
  items?: YapiJsonSchemaProperty;
  required?: string[];
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface YapiInterfaceDetail {
  _id: number;
  title: string;
  path: string;
  method: string;
  status: string;
  catid: number;
  project_id: number;
  uid: number;
  add_time: number;
  up_time: number;
  tag: string[];
  desc: string;
  markdown: string;
  // 请求参数
  req_query: YapiQueryParam[];
  req_headers: YapiHeader[];
  req_body_type: string; // "form" | "json" | "raw"
  req_body_form: YapiBodyFormItem[];
  req_body_other: string; // JSON Schema string (when req_body_type is "json")
  req_body_is_json_schema: boolean;
  req_params: Array<{ name: string; desc: string; example: string }>;
  // 响应参数
  res_body_type: string; // "json" | "raw"
  res_body: string; // JSON Schema string or raw body
  res_body_is_json_schema: boolean;
  // 其他
  username: string;
}

// ============ 搜索结果 ============

export interface YapiSearchResult {
  _id: number;
  title: string;
  path: string;
  method: string;
  uid: number;
  project_id: number;
  catid: number;
}

// ============ Token 相关 ============

export interface YapiProjectToken {
  token: string;
}

// ============ 登录相关 ============

export interface YapiLoginResponse {
  uid: number;
  username: string;
  email: string;
  role: string;
}

// ============ 分组相关 ============

export interface YapiGroup {
  _id: number;
  group_name: string;
  group_desc: string;
  type: string;
  uid: number;
  members: Array<{ uid: number; role: string }>;
}
