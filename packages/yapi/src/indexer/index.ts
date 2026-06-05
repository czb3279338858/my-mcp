/**
 * 索引管理器
 * 负责构建、加载、增量更新和搜索本地接口字段索引
 */

import type { YapiClient } from '../client/index.js';
import type { YapiInterfaceDetail, YapiJsonSchema, YapiJsonSchemaProperty } from '../client/types.js';
import type { IndexData, IndexedField, IndexedInterface } from '../types.js';
import { createEmptyIndex, loadIndexFromFile, saveIndexToFile } from './storage.js';

export interface IndexManagerOptions {
  indexPath: string;
  refreshCooldown: number;
  client: YapiClient;
}

export interface BuildResult {
  projectCount: number;
  interfaceCount: number;
  added: number;
  updated: number;
  removed: number;
  duration: number;
}

export interface FieldSearchResult {
  interfaceId: number;
  title: string;
  path: string;
  method: string;
  projectId: number;
  projectName: string;
  catName: string;
  matchedFields: Array<{
    name: string;
    desc: string;
    in: string;
    location: 'request' | 'response';
  }>;
}

export class IndexManager {
  private indexPath: string;
  private refreshCooldown: number;
  private client: YapiClient;
  private index: IndexData | null = null;
  private building = false;
  private lastCheckTime = 0;

  constructor(options: IndexManagerOptions) {
    this.indexPath = options.indexPath;
    this.refreshCooldown = options.refreshCooldown;
    this.client = options.client;
  }

  /**
   * 加载索引到内存
   */
  loadIndex(): IndexData | null {
    if (!this.index) {
      this.index = loadIndexFromFile(this.indexPath);
    }
    return this.index;
  }

  /**
   * 索引是否存在
   */
  hasIndex(): boolean {
    return this.loadIndex() !== null;
  }

  /**
   * 是否正在构建中
   */
  isBuilding(): boolean {
    return this.building;
  }

  /**
   * 是否需要刷新（超过 cooldown）
   */
  needsRefresh(): boolean {
    return Date.now() - this.lastCheckTime > this.refreshCooldown;
  }

  /**
   * 全量构建索引
   */
  async buildFull(): Promise<BuildResult> {
    if (this.building) {
      throw new Error('索引正在构建中，请稍后再试');
    }

    this.building = true;
    const startTime = Date.now();
    let added = 0;

    try {
      const newIndex = createEmptyIndex();
      const projects = await this.client.getAllProjects();

      for (const project of projects) {
        const interfaces = await this.client.getAllInterfacesByProject(project._id);
        const indexedInterfaces: IndexedInterface[] = [];

        for (const iface of interfaces) {
          try {
            const detail = await this.client.getInterfaceDetail(iface._id);
            const indexed = this.extractFields(detail, project._id, project.name, '');
            indexedInterfaces.push(indexed);
            added++;
          } catch {
            // 跳过获取失败的接口
          }
        }

        newIndex.projects[String(project._id)] = {
          name: project.name,
          interfaces: indexedInterfaces,
        };
      }

      newIndex.lastFullBuild = new Date().toISOString();
      newIndex.lastCheck = new Date().toISOString();

      // 保存到文件
      saveIndexToFile(this.indexPath, newIndex);
      this.index = newIndex;
      this.lastCheckTime = Date.now();

      return {
        projectCount: projects.length,
        interfaceCount: added,
        added,
        updated: 0,
        removed: 0,
        duration: Date.now() - startTime,
      };
    } finally {
      this.building = false;
    }
  }

  /**
   * 增量更新索引
   */
  async buildIncremental(): Promise<BuildResult> {
    if (this.building) {
      throw new Error('索引正在构建中，请稍后再试');
    }

    const currentIndex = this.loadIndex();
    if (!currentIndex) {
      // 没有现有索引，执行全量构建
      return this.buildFull();
    }

    this.building = true;
    const startTime = Date.now();
    let added = 0;
    let updated = 0;
    let removed = 0;

    try {
      const projects = await this.client.getAllProjects();
      const currentProjectIds = new Set(Object.keys(currentIndex.projects));
      const newProjectIds = new Set(projects.map((p) => String(p._id)));

      // 检测删除的项目
      for (const pid of currentProjectIds) {
        if (!newProjectIds.has(pid)) {
          const removedCount = currentIndex.projects[pid]?.interfaces.length || 0;
          removed += removedCount;
          delete currentIndex.projects[pid];
        }
      }

      // 遍历所有项目，对比接口 up_time
      for (const project of projects) {
        const pid = String(project._id);
        const existingProject = currentIndex.projects[pid];

        // 获取该项目所有接口列表（轻量）
        const interfaces = await this.client.getAllInterfacesByProject(project._id);

        if (!existingProject) {
          // 新项目，全量拉取
          const indexedInterfaces: IndexedInterface[] = [];
          for (const iface of interfaces) {
            try {
              const detail = await this.client.getInterfaceDetail(iface._id);
              indexedInterfaces.push(this.extractFields(detail, project._id, project.name, ''));
              added++;
            } catch { /* skip */ }
          }
          currentIndex.projects[pid] = { name: project.name, interfaces: indexedInterfaces };
        } else {
          // 已有项目，对比 up_time
          const existingMap = new Map(
            existingProject.interfaces.map((i) => [i.id, i])
          );
          const newInterfaceIds = new Set(interfaces.map((i) => i._id));

          // 检测删除的接口
          for (const existing of existingProject.interfaces) {
            if (!newInterfaceIds.has(existing.id)) {
              removed++;
            }
          }

          const updatedInterfaces: IndexedInterface[] = [];

          for (const iface of interfaces) {
            const existing = existingMap.get(iface._id);
            if (!existing || existing.upTime < iface.up_time) {
              // 新增或有更新
              try {
                const detail = await this.client.getInterfaceDetail(iface._id);
                updatedInterfaces.push(this.extractFields(detail, project._id, project.name, ''));
                if (existing) {
                  updated++;
                } else {
                  added++;
                }
              } catch { /* skip */ }
            } else {
              // 未变更，保留
              updatedInterfaces.push(existing);
            }
          }

          currentIndex.projects[pid] = { name: project.name, interfaces: updatedInterfaces };
        }
      }

      currentIndex.lastCheck = new Date().toISOString();

      // 保存
      saveIndexToFile(this.indexPath, currentIndex);
      this.index = currentIndex;
      this.lastCheckTime = Date.now();

      const totalInterfaces = Object.values(currentIndex.projects)
        .reduce((sum, p) => sum + p.interfaces.length, 0);

      return {
        projectCount: projects.length,
        interfaceCount: totalInterfaces,
        added,
        updated,
        removed,
        duration: Date.now() - startTime,
      };
    } finally {
      this.building = false;
    }
  }

  /**
   * 自动刷新检查（搜索前调用）
   * 如果超过 cooldown 则执行增量更新
   */
  async autoRefresh(): Promise<BuildResult | null> {
    if (!this.needsRefresh()) {
      return null;
    }
    if (this.building) {
      return null;
    }
    return this.buildIncremental();
  }

  /**
   * 按字段搜索
   */
  searchByField(
    fieldName: string,
    searchIn: 'request' | 'response' | 'both' = 'both',
    projectId?: number
  ): FieldSearchResult[] {
    const index = this.loadIndex();
    if (!index) return [];

    const results: FieldSearchResult[] = [];
    const keyword = fieldName.toLowerCase();

    for (const [pid, projectData] of Object.entries(index.projects)) {
      if (projectId !== undefined && Number(pid) !== projectId) continue;

      for (const iface of projectData.interfaces) {
        const matchedFields: FieldSearchResult['matchedFields'] = [];

        if (searchIn === 'request' || searchIn === 'both') {
          for (const field of iface.reqFields) {
            if (
              field.name.toLowerCase().includes(keyword) ||
              field.desc.toLowerCase().includes(keyword)
            ) {
              matchedFields.push({ ...field, location: 'request' });
            }
          }
        }

        if (searchIn === 'response' || searchIn === 'both') {
          for (const field of iface.resFields) {
            if (
              field.name.toLowerCase().includes(keyword) ||
              field.desc.toLowerCase().includes(keyword)
            ) {
              matchedFields.push({ ...field, location: 'response' });
            }
          }
        }

        if (matchedFields.length > 0) {
          results.push({
            interfaceId: iface.id,
            title: iface.title,
            path: iface.path,
            method: iface.method,
            projectId: iface.projectId,
            projectName: iface.projectName,
            catName: iface.catName,
            matchedFields,
          });
        }
      }
    }

    return results;
  }

  /**
   * 从接口详情中提取字段信息
   */
  private extractFields(
    detail: YapiInterfaceDetail,
    projectId: number,
    projectName: string,
    catName: string
  ): IndexedInterface {
    const reqFields: IndexedField[] = [];
    const resFields: IndexedField[] = [];

    // 提取 query 参数
    if (detail.req_query) {
      for (const q of detail.req_query) {
        reqFields.push({ name: q.name, desc: q.desc || '', in: 'query' });
      }
    }

    // 提取 header 参数
    if (detail.req_headers) {
      for (const h of detail.req_headers) {
        reqFields.push({ name: h.name, desc: h.desc || '', in: 'header' });
      }
    }

    // 提取 body 参数（form）
    if (detail.req_body_form) {
      for (const f of detail.req_body_form) {
        reqFields.push({ name: f.name, desc: f.desc || '', in: 'body' });
      }
    }

    // 提取 body 参数（JSON Schema）
    if (detail.req_body_other && detail.req_body_is_json_schema) {
      try {
        const schema = JSON.parse(detail.req_body_other) as YapiJsonSchema;
        this.extractJsonSchemaFields(schema, reqFields, 'body');
      } catch { /* ignore */ }
    }

    // 提取响应参数（JSON Schema）
    if (detail.res_body && detail.res_body_is_json_schema) {
      try {
        const schema = JSON.parse(detail.res_body) as YapiJsonSchema;
        this.extractJsonSchemaFields(schema, resFields, 'body');
      } catch { /* ignore */ }
    }

    return {
      id: detail._id,
      title: detail.title,
      path: detail.path,
      method: detail.method,
      projectId,
      projectName,
      catName,
      upTime: detail.up_time,
      reqFields,
      resFields,
    };
  }

  /**
   * 递归提取 JSON Schema 中的字段
   */
  private extractJsonSchemaFields(
    schema: YapiJsonSchema | YapiJsonSchemaProperty,
    fields: IndexedField[],
    location: string,
    prefix = ''
  ): void {
    if (schema.properties) {
      for (const [name, prop] of Object.entries(schema.properties)) {
        const fullName = prefix ? `${prefix}.${name}` : name;
        fields.push({
          name: fullName,
          desc: prop.description || '',
          in: location,
        });

        // 递归嵌套对象
        if (prop.properties) {
          this.extractJsonSchemaFields(prop, fields, location, fullName);
        }

        // 递归数组项
        if (prop.items && prop.items.properties) {
          this.extractJsonSchemaFields(prop.items, fields, location, `${fullName}[]`);
        }
      }
    }

    // 数组类型的根
    if (schema.items && schema.items.properties) {
      this.extractJsonSchemaFields(schema.items, fields, location, prefix ? `${prefix}[]` : '[]');
    }
  }
}
