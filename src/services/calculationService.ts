// 计算数学服务 - 用于处理SymPy计算和结果管理

// 计算结果类型
export interface CalculationResult {
  success: boolean;
  result: string;
  error?: string;
  calculationTime: number;
}

// 计算历史记录类型
export interface CalculationHistoryItem {
  id: string;
  code: string;
  result: string;
  timestamp: Date;
  calculationTime: number;
}

class CalculationService {
  private history: CalculationHistoryItem[] = [];

  private maxHistoryItems = 50;

  // 执行SymPy计算
  async executeSymPyCalculation (code: string): Promise<CalculationResult> {
    const startTime = Date.now();

    try {
      // 这里将替换为实际的SymPy计算逻辑
      // 暂时使用模拟计算
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟不同类型的计算结果
      let result = '';

      if (code.includes('integrate')) {
        result = '\\int ' + code.replace('integrate', '').trim() + ' dx = (1/3)x^3 + C';
      } else if (code.includes('diff')) {
        result = `d/dx ${code.replace('diff', '').trim()} = 2x`;
      } else if (code.includes('solve')) {
        result = '解: [x = 0, x = 1]';
      } else {
        result = `计算结果: ${code} = 42`;
      }

      const calculationTime = Date.now() - startTime;

      return {
        'success': true,
        result,
        calculationTime
      };
    } catch (error) {
      const calculationTime = Date.now() - startTime;

      return {
        'success': false,
        'result': '',
        'error': error instanceof Error ? error.message : '计算失败',
        calculationTime
      };
    }
  }

  // 获取计算历史记录
  getHistory (): CalculationHistoryItem[] {
    return [...this.history];
  }

  // 添加到历史记录
  addToHistory (code: string, result: string, calculationTime: number): void {
    const historyItem: CalculationHistoryItem = {
      'id': `calc-${Date.now()}-${Math.random().toString(36)
        .substr(2, 9)}`,
      code,
      result,
      'timestamp': new Date(),
      calculationTime
    };

    this.history.unshift(historyItem);

    // 限制历史记录数量
    if (this.history.length > this.maxHistoryItems) {
      this.history = this.history.slice(0, this.maxHistoryItems);
    }
  }

  // 清除历史记录
  clearHistory (): void {
    this.history = [];
  }

  // 删除特定历史记录项
  deleteHistoryItem (id: string): void {
    this.history = this.history.filter(item => item.id !== id);
  }
}

// 创建单例实例
const calculationService = new CalculationService();

export default calculationService;
