import { useState, useEffect, useRef, useCallback } from 'react';
import calculationService from '../../services/calculationService';

interface NerdamerCell {
  id: string;
  code: string;
  result: string;
}

interface NerdamerCellRendererProps {
  contentRef: React.RefObject<HTMLDivElement>;
}

// 单个Nerdamer单元格组件
const NerdamerCellComponent: React.FC<{
  cell: NerdamerCell;
  onCalculate: (_id: string, _code: string) => void;
}> = ({ cell, onCalculate }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
      <div className="bg-gray-100 dark:bg-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Nerdamer 计算单元格</h3>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">代码:</label>
          <pre className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md font-mono text-sm">{cell.code}</pre>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">结果:</label>
          <div
            id={`${cell.id}-result`}
            className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-md min-h-[60px]"
          >
            {cell.result}
          </div>
        </div>
        <button
          onClick={() => onCalculate(cell.id, cell.code)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
        >
          运行计算
        </button>
      </div>
    </div>
  );
};

export function NerdamerCellRenderer ({ contentRef }: NerdamerCellRendererProps) {
  const [cells, setCells] = useState<NerdamerCell[]>([]);
  const initializedRef = useRef(false);

  // 处理计算
  const handleCalculation = useCallback(async (id: string, code: string) => {
    try {
      const result = await calculationService.executeNerdamerCalculation(code);
      setCells(prevCells =>
        prevCells.map(cell =>
          cell.id === id
            ? { ...cell, 'result': result.success ? result.result : `错误: ${result.error}` }
            : cell
        )
      );
    } catch (error) {
      console.error('计算失败:', error);
      setCells(prevCells =>
        prevCells.map(cell =>
          cell.id === id
            ? { ...cell, 'result': '计算过程中发生错误' }
            : cell
        )
      );
    }
  }, []);

  // 初始化单元格
  const initializeCells = useCallback(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }

    const placeholders = contentElement.querySelectorAll('.nerdamer-cell-placeholder');
    const newCells: NerdamerCell[] = [];

    placeholders.forEach((placeholder) => {
      const code = placeholder.getAttribute('data-nerdamer-code');
      const id = placeholder.getAttribute('data-nerdamer-id');

      if (code && id) {
        // 创建容器元素
        const cellContainer = document.createElement('div');
        cellContainer.className = 'nerdamer-cell-wrapper';
        placeholder.parentNode?.replaceChild(cellContainer, placeholder);

        // 添加到状态
        newCells.push({
          id,
          'code': decodeURIComponent(code),
          'result': '点击"运行计算"按钮查看结果'
        });
      }
    });

    setCells(newCells);
  }, [contentRef]);

  // 渲染单元格到DOM
  useEffect(() => {
    initializeCells();
  }, [initializeCells]);

  // 当单元格状态变化时，重新渲染所有单元格
  useEffect(() => {
    if (cells.length === 0) {
      return;
    }

    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }

    cells.forEach(cell => {
      const existingContainer = contentElement.querySelector(`#nerdamer-cell-${cell.id}`);
      if (existingContainer) {
        // 清空容器并渲染新的单元格组件
        existingContainer.innerHTML = '';
        const cellElement = document.createElement('div');
        existingContainer.appendChild(cellElement);

        // 使用ReactDOM.render渲染组件
        import('react-dom/client').then(({ createRoot }) => {
          const root = createRoot(cellElement);
          root.render(
            <NerdamerCellComponent
              cell={cell}
              onCalculate={handleCalculation}
            />
          );
        });
      } else {
        // 为每个单元格创建容器
        const cellWrapper = contentElement.querySelector(`.nerdamer-cell-wrapper[data-nerdamer-id="${cell.id}"]`) ||
                          contentElement.querySelector('.nerdamer-cell-wrapper');

        if (cellWrapper) {
          cellWrapper.setAttribute('data-nerdamer-id', cell.id);
          const newContainer = document.createElement('div');
          newContainer.id = `nerdamer-cell-${cell.id}`;
          cellWrapper.appendChild(newContainer);

          // 使用ReactDOM.render渲染组件
          import('react-dom/client').then(({ createRoot }) => {
            const root = createRoot(newContainer);
            root.render(
              <NerdamerCellComponent
                cell={cell}
                onCalculate={handleCalculation}
              />
            );
          });
        }
      }
    });
  }, [cells, handleCalculation, contentRef]);

  return null;
}
