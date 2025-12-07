/**
 * 模板服务
 * 提供内容模板的CRUD操作
 */
import { BaseService } from './baseService';
import type { ContentTemplate, TemplateCategory, CreateTemplateRequest, UpdateTemplateRequest } from '../types/template';
import { CACHE_TTL } from '../utils/db-optimization';

// 预设模板分类
const PRESET_CATEGORIES: Omit<TemplateCategory, 'id' | 'created_at' | 'updated_at'>[] = [
  { name: '文章', description: '各种类型的文章模板' },
  { name: '报告', description: '专业报告和文档模板' },
  { name: '教程', description: '教程和学习资料模板' },
  { name: '笔记', description: '个人笔记和学习记录模板' },
  { name: '演示文稿', description: '演示文稿和幻灯片模板' },
];

// 预设模板
const PRESET_TEMPLATES: Omit<ContentTemplate, 'id' | 'created_by' | 'created_at' | 'updated_at'>[] = [
  {
    name: '学术论文',
    description: '标准学术论文模板，包含摘要、引言、方法、结果和结论',
    content: `# 论文标题

## 摘要
[在这里填写论文摘要]

## 关键词
关键词1, 关键词2, 关键词3

## 1. 引言
[在这里介绍研究背景和意义]

## 2. 相关工作
[在这里综述相关研究]

## 3. 研究方法
[在这里描述研究方法和实验设计]

## 4. 实验结果
[在这里展示实验结果]

### 4.1 实验设置
[描述实验环境和参数设置]

### 4.2 结果分析
[分析实验结果和数据]

## 5. 结论
[总结研究成果和未来工作]

## 参考文献
1. [参考文献1]
2. [参考文献2]
3. [参考文献3]
`,
    category_id: '', // 会在初始化时分配
    is_public: true,
    tags: ['学术', '论文', '研究']
  },
  {
    name: '技术教程',
    description: '技术教程模板，包含章节、代码示例和练习',
    content: `# 教程标题

## 介绍
[在这里介绍教程内容和目标]

## 前提条件
[列出学习本教程需要的知识和工具]

## 1. 基础概念
[解释基础概念和原理]

## 2. 动手实践

### 2.1 第一步
[详细描述第一步操作]

\`\`\`javascript
// 代码示例
console.log('Hello, World!');
\`\`\`

### 2.2 第二步
[详细描述第二步操作]

## 3. 进阶内容
[介绍更高级的概念和技术]

## 4. 练习
1. [练习1]
2. [练习2]
3. [练习3]

## 5. 总结
[总结教程内容和要点]
`,
    category_id: '', // 会在初始化时分配
    is_public: true,
    tags: ['教程', '技术', '编程']
  },
  {
    name: '会议记录',
    description: '会议记录模板，包含会议信息、议程和决议',
    content: `# 会议记录

## 会议信息
- **日期**: [会议日期]
- **时间**: [会议时间]
- **地点**: [会议地点]
- **主持人**: [主持人姓名]
- **记录人**: [记录人姓名]
- **参会人员**: [参会人员列表]

## 议程
1. [议程项1]
2. [议程项2]
3. [议程项3]

## 讨论内容

### 1. 议程项1讨论
- 要点1
- 要点2
- 要点3

### 2. 议程项2讨论
- 要点1
- 要点2
- 要点3

## 决议
1. **决议1**: [决议内容]
   - 负责人: [负责人姓名]
   - 截止日期: [截止日期]

2. **决议2**: [决议内容]
   - 负责人: [负责人姓名]
   - 截止日期: [截止日期]

## 后续行动
- [行动项1]
- [行动项2]

## 下次会议安排
- **日期**: [下次会议日期]
- **时间**: [下次会议时间]
- **议题**: [下次会议议题]
`,
    category_id: '', // 会在初始化时分配
    is_public: true,
    tags: ['会议', '记录', '办公']
  }
];

export class TemplateService extends BaseService {
  private static instance: TemplateService;
  private readonly CACHE_PREFIX = 'template';

  private constructor() {
    super();
    this.initializeTemplates();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * 初始化模板，创建预设分类和模板
   */
  private async initializeTemplates(): Promise<void> {
    try {
      this.checkSupabaseClient();
      
      // 检查是否已初始化
      const { data: existingCategories } = await this.supabase
        .from('template_categories')
        .select('id')
        .limit(1);

      if (existingCategories && existingCategories.length > 0) {
        return; // 已初始化
      }

      // 创建预设分类
      const now = new Date();
      const categories: TemplateCategory[] = PRESET_CATEGORIES.map((cat, index) => ({
        id: `cat_${index + 1}`,
        ...cat,
        created_at: now,
        updated_at: now
      }));

      await this.supabase.from('template_categories').insert(categories);

      // 创建预设模板
      const templates: ContentTemplate[] = PRESET_TEMPLATES.map((template, index) => ({
        id: `template_${index + 1}`,
        ...template,
        category_id: categories[0]?.id || 'default', // 默认为第一个分类或default
        created_by: 'system',
        created_at: now,
        updated_at: now
      }));

      await this.supabase.from('templates').insert(templates);
    } catch (error) {
      console.error('Failed to initialize templates:', error);
    }
  }

  /**
   * 获取模板分类列表
   */
  async getTemplateCategories(): Promise<TemplateCategory[]> {
    const cacheKey = `${this.CACHE_PREFIX}:categories`;

    return this.queryWithCache<TemplateCategory[]>(cacheKey, CACHE_TTL.articles, async () => {
      try {
        this.checkSupabaseClient();
        const { data, error } = await this.supabase
          .from('template_categories')
          .select('*')
          .order('name');

        if (error) {
          this.handleError(error, '获取模板分类', 'TemplateService');
          return [];
        }

        return data || [];
      } catch (error) {
        console.error('Failed to get template categories:', error);
        return [];
      }
    });
  }

  /**
   * 获取模板列表
   */
  async getTemplates(categoryId?: string): Promise<ContentTemplate[]> {
    const cacheKey = `${this.CACHE_PREFIX}:list:${categoryId || 'all'}`;

    return this.queryWithCache<ContentTemplate[]>(cacheKey, CACHE_TTL.articles, async () => {
      try {
        this.checkSupabaseClient();
        let query = this.supabase.from('templates').select('*').order('created_at', { ascending: false });

        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;

        if (error) {
          this.handleError(error, '获取模板列表', 'TemplateService');
          return [];
        }

        return data || [];
      } catch (error) {
        console.error('Failed to get templates:', error);
        return [];
      }
    });
  }

  /**
   * 获取单个模板
   */
  async getTemplateById(id: string): Promise<ContentTemplate | null> {
    const cacheKey = `${this.CACHE_PREFIX}:${id}`;

    return this.queryWithCache<ContentTemplate | null>(cacheKey, CACHE_TTL.articles, async () => {
      try {
        this.checkSupabaseClient();
        const { data, error } = await this.supabase
          .from('templates')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          this.handleError(error, '获取模板详情', 'TemplateService');
          return null;
        }

        return data;
      } catch (error) {
        console.error(`Failed to get template with id ${id}:`, error);
        return null;
      }
    });
  }

  /**
   * 创建模板
   */
  async createTemplate(templateData: CreateTemplateRequest): Promise<ContentTemplate | null> {
    try {
      this.checkSupabaseClient();
      const now = new Date();
      const { data, error } = await this.supabase
        .from('templates')
        .insert({
          ...templateData,
          created_by: 'user', // 实际应用中应该使用真实用户ID
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) {
        this.handleError(error, '创建模板', 'TemplateService');
        return null;
      }

      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:*`);

      return data;
    } catch (error) {
      console.error('Failed to create template:', error);
      return null;
    }
  }

  /**
   * 更新模板
   */
  async updateTemplate(id: string, templateData: UpdateTemplateRequest): Promise<ContentTemplate | null> {
    try {
      this.checkSupabaseClient();
      const now = new Date();
      const { data, error } = await this.supabase
        .from('templates')
        .update({
          ...templateData,
          updated_at: now
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        this.handleError(error, '更新模板', 'TemplateService');
        return null;
      }

      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:*`);

      return data;
    } catch (error) {
      console.error(`Failed to update template with id ${id}:`, error);
      return null;
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      this.checkSupabaseClient();
      const { error } = await this.supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) {
        this.handleError(error, '删除模板', 'TemplateService');
        return false;
      }

      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:*`);

      return true;
    } catch (error) {
      console.error(`Failed to delete template with id ${id}:`, error);
      return false;
    }
  }

  /**
   * 搜索模板
   */
  async searchTemplates(query: string): Promise<ContentTemplate[]> {
    const cacheKey = `${this.CACHE_PREFIX}:search:${query}`;

    return this.queryWithCache<ContentTemplate[]>(cacheKey, CACHE_TTL.articles, async () => {
      try {
        this.checkSupabaseClient();
        const { data, error } = await this.supabase
          .from('templates')
          .select('*')
          .ilike('name', `%${query}%`)
          .or(`ilike(description, '%${query}%')`)
          .order('created_at', { ascending: false });

        if (error) {
          this.handleError(error, '搜索模板', 'TemplateService');
          return [];
        }

        return data || [];
      } catch (error) {
        console.error(`Failed to search templates with query '${query}':`, error);
        return [];
      }
    });
  }
}

// 导出单例实例
export const templateService = TemplateService.getInstance();
