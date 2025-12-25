// 计算数学服务 - 使用Nerdamer进行符号计算

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

// 导入Nerdamer
import nerdamer from 'nerdamer';

class CalculationService {
  private history: CalculationHistoryItem[] = [];

  private maxHistoryItems = 50;

  // 执行Nerdamer计算
  async executeNerdamerCalculation (code: string): Promise<CalculationResult> {
    const startTime = Date.now();

    try {
      // 使用Nerdamer进行符号计算
      const result = this.evaluateWithNerdamer(code);

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

  // 使用Nerdamer进行符号计算
  private evaluateWithNerdamer (expression: string): string {
    try {
      // 直接使用nerdamer进行计算
      const result = nerdamer(expression);
      return result.text();
    } catch {
      // 尝试不同的计算类型
      const trimmedExpr = expression.trim();

      // 检查是否是求导
      if (trimmedExpr.startsWith('diff(') && trimmedExpr.endsWith(')')) {
        const match = trimmedExpr.match(/diff\((.*?),(.*?)\)/);
        if (match && match[1] && match[2]) {
          return nerdamer.diff(match[1], match[2]).text();
        }
      }

      // 检查是否是积分
      if (trimmedExpr.startsWith('integrate(') && trimmedExpr.endsWith(')')) {
        const match = trimmedExpr.match(/integrate\((.*?),(.*?)\)/);
        if (match && match[1] && match[2]) {
          return nerdamer.integrate(match[1], match[2]).text();
        }
      }

      // 检查是否是求解
      if (trimmedExpr.startsWith('solve(') && trimmedExpr.endsWith(')')) {
        const match = trimmedExpr.match(/solve\((.*?),(.*?)\)/);
        if (match && match[1] && match[2]) {
          const equation = match[1] + '=0';
          const result = nerdamer(equation);
          // 使用类型断言为 unknown 并通过类型守卫处理
          const resultUnknown = result as unknown;
          if (typeof resultUnknown === 'object' && resultUnknown !== null && 'solveFor' in resultUnknown) {
            const solveForResult = (resultUnknown as {
              solveFor: (_variable: string) => { text: () => string }
            }).solveFor(match[2]);
            return solveForResult.text();
          }
          throw new Error('无法解析的数学表达式');
        }
      }

      throw new Error('无法解析的数学表达式');
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
        .substring(2, 9)}`,
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
