/**
 * 服务工厂类，用于管理所有服务的单例实例
 * 优化点：
 * 1. 统一管理所有服务的单例实例
 * 2. 延迟初始化服务实例，提高应用启动性能
 * 3. 提供统一的服务访问接口，方便后续扩展和维护
 * 4. 支持服务实例的重置和替换，方便测试
 */

import { ArticleService } from './articleService';
import { CommentService } from './commentService';
import { GraphService } from './graphService';
import { SearchService } from './searchService';

import { VersionHistoryService } from './versionHistoryService';
import { AnalyticsService } from './analyticsService';
import CalculationService from './calculationService';
import { DiscussionService } from './discussionService';
import { ErrorService } from './errorService';
import { ExportService } from './exportService';
import { FileService } from './fileService';
import { SemanticSearchService } from './semanticSearchService';
import { TemplateService } from './templateService';

// 服务映射接口
interface ServiceMap {
  article: ArticleService;
  comment: CommentService;
  graph: GraphService;
  search: SearchService;
  versionHistory: VersionHistoryService;
  analytics: AnalyticsService;
  calculation: typeof CalculationService;
  discussion: DiscussionService;
  error: ErrorService;
  export: ExportService;
  file: FileService;
  semanticSearch: SemanticSearchService;
  template: TemplateService;
}

/**
 * 服务工厂类
 */
export class ServiceFactory {
  private static instance: ServiceFactory;

  private serviceInstances: Partial<ServiceMap> = {};

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor () {
    // 初始化错误服务，因为其他服务可能依赖它
    this.serviceInstances.error = ErrorService.getInstance();
  }

  /**
   * 获取服务工厂单例实例
   */
  public static getInstance (): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * 获取服务实例
   * @param serviceType 服务类型
   */
  public getService<T extends keyof ServiceMap> (serviceType: T): ServiceMap[T] {
    // 如果服务实例已存在，直接返回
    if (this.serviceInstances[serviceType]) {
      return this.serviceInstances[serviceType] as ServiceMap[T];
    }

    // 否则创建新实例
    let instance: ServiceMap[T];

    switch (serviceType) {
      case 'article':
        instance = new ArticleService() as ServiceMap[T];
        break;
      case 'comment':
        instance = new CommentService() as ServiceMap[T];
        break;
      case 'graph':
        instance = new GraphService() as ServiceMap[T];
        break;
      case 'search':
        instance = SearchService.getInstance() as ServiceMap[T];
        break;
      case 'versionHistory':
        instance = new VersionHistoryService() as ServiceMap[T];
        break;
      case 'analytics':
        instance = AnalyticsService.getInstance() as ServiceMap[T];
        break;
      case 'calculation':
        instance = CalculationService as ServiceMap[T];
        break;
      case 'discussion':
        instance = new DiscussionService() as ServiceMap[T];
        break;
      case 'error':
        instance = (this.serviceInstances.error || ErrorService.getInstance()) as ServiceMap[T];
        break;
      case 'export':
        instance = ExportService.getInstance() as ServiceMap[T];
        break;
      case 'file':
        instance = FileService.getInstance() as ServiceMap[T];
        break;
      case 'semanticSearch':
        instance = SemanticSearchService.getInstance() as ServiceMap[T];
        break;
      case 'template':
        instance = TemplateService.getInstance() as ServiceMap[T];
        break;
      default:
        throw new Error(`Unknown service type: ${serviceType}`);
    }

    // 存储实例并返回
    this.serviceInstances[serviceType] = instance;
    return instance;
  }

  /**
   * 重置服务实例
   * @param serviceType 服务类型（可选，如果不提供则重置所有服务）
   */
  public resetService<T extends keyof ServiceMap> (serviceType?: T): void {
    if (serviceType) {
      // 重置指定服务
      delete this.serviceInstances[serviceType];
      // 如果是错误服务，需要重新初始化
      if (serviceType === 'error') {
        this.serviceInstances.error = ErrorService.getInstance();
      }
    } else {
      // 重置所有服务
      this.serviceInstances = {};
      // 重新初始化错误服务
      this.serviceInstances.error = ErrorService.getInstance();
    }
  }

  /**
   * 替换服务实例（用于测试）
   * @param serviceType 服务类型
   * @param instance 服务实例
   */
  public replaceService<T extends keyof ServiceMap> (serviceType: T, instance: ServiceMap[T]): void {
    this.serviceInstances[serviceType] = instance;
  }

  /**
   * 获取所有服务实例
   */
  public getAllServices (): ServiceMap {
    // 确保所有服务都已初始化
    Object.keys(this.serviceInstances).forEach(key => {
      this.getService(key as keyof ServiceMap);
    });
    return this.serviceInstances as ServiceMap;
  }
}

// 导出服务工厂实例
export const serviceFactory = ServiceFactory.getInstance();

// 导出便捷的服务访问方法
export const getService = <T extends keyof ServiceMap>(serviceType: T): ServiceMap[T] => {
  return serviceFactory.getService(serviceType);
};
