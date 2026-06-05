/**
 * 索引文件持久化存储
 * 负责 JSON 文件的读写、目录创建、原子写入
 */

import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { IndexData } from '../types.js';

/**
 * 创建空索引
 */
export function createEmptyIndex(): IndexData {
  return {
    version: 1,
    lastFullBuild: null,
    lastCheck: null,
    projects: {},
  };
}

/**
 * 从文件加载索引
 * 如果文件不存在返回 null
 */
export function loadIndexFromFile(filePath: string): IndexData | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as IndexData;

    // 版本检查
    if (data.version !== 1) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * 将索引保存到文件（原子写入）
 * 先写临时文件再重命名，避免写入中断导致文件损坏
 */
export function saveIndexToFile(filePath: string, data: IndexData): void {
  // 确保目录存在
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  // 写入临时文件
  const tmpPath = join(dir, `.index_${Date.now()}.tmp`);
  try {
    writeFileSync(tmpPath, JSON.stringify(data), 'utf-8');
    // 原子替换
    renameSync(tmpPath, filePath);
  } catch (err) {
    // 清理临时文件
    try {
      if (existsSync(tmpPath)) {
        writeFileSync(tmpPath, ''); // 清空而非删除（避免用 unlink）
      }
    } catch { /* ignore */ }
    throw err;
  }
}
