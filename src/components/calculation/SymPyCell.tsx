import React, { useState, useRef } from 'react';
import styles from './SymPyCell.module.css';
import calculationService from '../../services/calculationService';

interface SymPyCellProps {
  id: string;
  initialCode?: string;
  onResultChange?: (id: string, result: string) => void;
}

const SymPyCell: React.FC<SymPyCellProps> = ({ 
  id, 
  initialCode = '', 
  onResultChange 
}) => {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string>('');

  const cellRef = useRef<HTMLDivElement>(null);

  // 计算函数 - 使用calculationService处理SymPy计算
  const calculate = async () => {
    if (!code.trim()) return;

    setIsCalculating(true);
    setError('');
    
    try {
      // 使用计算服务执行SymPy计算
      const calculationResult = await calculationService.executeSymPyCalculation(code);
      
      if (calculationResult.success) {
        const formattedResult = `${calculationResult.result}\n(计算时间: ${calculationResult.calculationTime}ms)`;
        setResult(formattedResult);
        
        // 添加到计算历史记录
        calculationService.addToHistory(code, calculationResult.result, calculationResult.calculationTime);
        
        if (onResultChange) {
          onResultChange(id, formattedResult);
        }
      } else {
        setError(calculationResult.error || '计算失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算失败');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleRun = () => {
    calculate();
  };

  const handleClear = () => {
    setCode('');
    setResult('');
    setError('');
  };

  return (
    <div className={styles.container} ref={cellRef}>
      <div className={styles.header}>
        <h3 className={styles.title}>SymPy 计算单元格</h3>
        <div className={styles.actions}>
          <button 
            className={styles.runButton} 
            onClick={handleRun} 
            disabled={isCalculating}
          >
            {isCalculating ? '计算中...' : '运行'}
          </button>
          <button 
            className={styles.clearButton} 
            onClick={handleClear}
          >
            清除
          </button>
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.codeSection}>
          <label className={styles.label}>输入代码:</label>
          <textarea
            className={styles.codeInput}
            value={code}
            onChange={handleCodeChange}
            placeholder="输入SymPy代码，例如: integrate(x**2, x)"
            rows={5}
          />
        </div>
        
        {error && (
          <div className={styles.errorSection}>
            <label className={styles.label}>错误:</label>
            <pre className={styles.errorOutput}>{error}</pre>
          </div>
        )}
        
        {result && (
          <div className={styles.resultSection}>
            <label className={styles.label}>结果:</label>
            <pre className={styles.resultOutput}>{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SymPyCell;