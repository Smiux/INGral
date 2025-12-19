import { useState, useEffect, useCallback } from 'react';
import { X, Save, RotateCw, PlusCircle, MinusCircle, MoreHorizontal } from 'lucide-react';

interface TableEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (_tableMarkdown: string) => void;
  initialTable?: string;
}

interface TableCell {
  content: string;
  colspan: number;
  rowspan: number;
}

interface TableRow {
  cells: TableCell[];
}

export function TableEditor ({ isOpen, onClose, onInsert, initialTable = '' }: TableEditorProps) {
  const [table, setTable] = useState<TableRow[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);
  const [tableMarkdown, setTableMarkdown] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [startSelectRow, setStartSelectRow] = useState(0);
  const [startSelectCol, setStartSelectCol] = useState(0);

  // 解析Markdown表格为内部表格结构
  const parseTable = (markdown: string) => {
    const lines = markdown.trim().split('\n')
      .filter(line => line.trim());
    if (lines.length < 2) {
      return;
    }

    // 跳过分隔线
    const dataLines = lines.filter((_, index) => index !== 1);
    const parsedTable: TableRow[] = [];

    dataLines.forEach(line => {
      const cells = line.match(/\|(.*?)\|/g) || [];
      const row: TableRow = { 'cells': [] };

      cells.slice(1, -1).forEach(cell => {
        const content = cell.substring(1, cell.length - 1).trim();
        row.cells.push({ content, 'colspan': 1, 'rowspan': 1 });
      });

      parsedTable.push(row);
    });

    setTable(parsedTable);
  };

  // 初始化表格
  useEffect(() => {
    if (initialTable.trim()) {
      parseTable(initialTable);
    } else {
      // 默认创建一个2x2的表格
      const defaultTable: TableRow[] = [
        { 'cells': [{ 'content': '标题1', 'colspan': 1, 'rowspan': 1 }, { 'content': '标题2', 'colspan': 1, 'rowspan': 1 }] },
        { 'cells': [{ 'content': '内容1', 'colspan': 1, 'rowspan': 1 }, { 'content': '内容2', 'colspan': 1, 'rowspan': 1 }] }
      ];
      setTable(defaultTable);
    }
  }, [initialTable]);

  // 生成Markdown表格
  const generateMarkdownTable = useCallback(() => {
    if (table.length === 0) {
      return '';
    }

    // 计算每列的最大宽度
    const colCount = Math.max(...table.map(row => row.cells.length));
    const columnWidths = Array(colCount).fill(0);

    table.forEach(row => {
      row.cells.forEach((cell, index) => {
        columnWidths[index] = Math.max(columnWidths[index], cell.content.length);
      });
    });

    // 生成表头
    let markdown = '';

    // 第一行作为表头
    markdown += '|';
    if (table[0] && table[0].cells) {
      table[0].cells.forEach((cell, index) => {
        const padding = ' '.repeat(columnWidths[index] - cell.content.length + 2);
        markdown += `${cell.content}${padding}|`;
      });
      markdown += '\n';

      // 生成分隔线
      markdown += '|';
      table[0].cells.forEach((_, index) => {
        const padding = '-'.repeat(columnWidths[index] + 2);
        markdown += `${padding}|`;
      });
      markdown += '\n';
    }

    // 生成数据行
    for (let i = 1; i < table.length; i += 1) {
      markdown += '|';
      const currentRow = table[i];
      if (currentRow && currentRow.cells && Array.isArray(currentRow.cells)) {
        for (let j = 0; j < currentRow.cells.length; j += 1) {
          const cell = currentRow.cells[j];
          if (cell) {
            const padding = ' '.repeat(columnWidths[j] - cell.content.length + 2);
            markdown += `${cell.content}${padding}|`;
          }
        }
      }
      markdown += '\n';
    }

    return markdown;
  }, [table]);

  // 当表格变化时更新Markdown
  useEffect(() => {
    const markdown = generateMarkdownTable();
    setTableMarkdown(markdown);
  }, [table, generateMarkdownTable]);

  // 添加行
  const handleAddRow = () => {
    const newRow: TableRow = { 'cells': [] };
    const maxCols = Math.max(...table.map(row => row.cells.length));
    for (let i = 0; i < maxCols; i += 1) {
      newRow.cells.push({ 'content': '', 'colspan': 1, 'rowspan': 1 });
    }
    setTable([...table, newRow]);
  };

  // 删除行
  const handleDeleteRow = () => {
    if (table.length <= 1 || !selectedCell) {
      return;
    }
    const newTable = table.filter((_, index) => index !== selectedCell.row);
    setTable(newTable);
    setSelectedCell(null);
  };

  // 添加列
  const handleAddColumn = () => {
    const newTable = table.map(row => ({
      'cells': [...row.cells, { 'content': '', 'colspan': 1, 'rowspan': 1 }]
    }));
    setTable(newTable);
  };

  // 删除列
  const handleDeleteColumn = () => {
    if (!selectedCell) {
      return;
    }
    const newTable = table.map(row => ({
      'cells': row.cells.filter((_, index) => index !== selectedCell.col)
    }));
    setTable(newTable);
    setSelectedCell(null);
  };

  // 合并单元格
  const handleMergeCells = () => {
    if (!selectionRange) {
      return;
    }

    const { startRow, startCol, endRow, endCol } = selectionRange;
    if (startRow === endRow && startCol === endCol) {
      return;
    }

    // 计算合并后的单元格内容
    if (table[startRow] && table[startRow].cells && table[startRow].cells[startCol]) {
      const mergedContent = table[startRow].cells[startCol].content;
      const newTable = [...table];

      // 更新起始单元格
      if (newTable[startRow] && newTable[startRow].cells) {
        newTable[startRow].cells[startCol] = {
          'content': mergedContent,
          'colspan': endCol - startCol + 1,
          'rowspan': endRow - startRow + 1
        };

        // 辅助函数：清除被合并的单元格
        const clearMergedCells = (tableData: typeof newTable) => {
          for (let i = startRow; i <= endRow; i += 1) {
            for (let j = startCol; j <= endCol; j += 1) {
              if (!(i === startRow && j === startCol)) {
                const row = tableData[i];
                if (row && row.cells && Array.isArray(row.cells)) {
                  row.cells[j] = { 'content': '', 'colspan': 0, 'rowspan': 0 };
                }
              }
            }
          }
        };

        // 清除被合并的单元格
        clearMergedCells(newTable);

        setTable(newTable);
        setSelectionRange(null);
        setSelectedCell({ 'row': startRow, 'col': startCol });
      }
    }
  };

  // 拆分单元格
  const handleSplitCell = (rowIndex: number, colIndex: number) => {
    if (table[rowIndex] && table[rowIndex].cells && table[rowIndex].cells[colIndex]) {
      const cell = table[rowIndex].cells[colIndex];
      if (cell.colspan === 1 && cell.rowspan === 1) {
        return;
      }

      const newTable = [...table];

      // 重置为单个单元格
      if (newTable[rowIndex] && newTable[rowIndex].cells) {
        newTable[rowIndex].cells[colIndex] = {
          'content': cell.content,
          'colspan': 1,
          'rowspan': 1
        };

        setTable(newTable);
      }
    }
  };

  // 更新单元格内容
  const handleCellChange = (rowIndex: number, colIndex: number, content: string) => {
    const newTable = [...table];
    if (newTable[rowIndex] && newTable[rowIndex].cells && newTable[rowIndex].cells[colIndex]) {
      newTable[rowIndex].cells[colIndex].content = content;
      setTable(newTable);
    }
  };

  // 处理单元格点击
  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ 'row': rowIndex, 'col': colIndex });
    setIsSelecting(true);
    setStartSelectRow(rowIndex);
    setStartSelectCol(colIndex);
    setSelectionRange(null);
  };

  // 处理单元格鼠标进入
  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isSelecting) {
      const startRow = Math.min(startSelectRow, rowIndex);
      const startCol = Math.min(startSelectCol, colIndex);
      const endRow = Math.max(startSelectRow, rowIndex);
      const endCol = Math.max(startSelectCol, colIndex);
      setSelectionRange({ startRow, startCol, endRow, endCol });
    }
  };

  // 处理鼠标离开表格
  const handleMouseLeaveTable = () => {
    setIsSelecting(false);
  };

  // 插入表格到文章
  const handleInsert = () => {
    onInsert(tableMarkdown);
    onClose();
  };

  // 清除表格
  const handleClear = () => {
    const defaultTable: TableRow[] = [
      { 'cells': [{ 'content': '标题1', 'colspan': 1, 'rowspan': 1 }, { 'content': '标题2', 'colspan': 1, 'rowspan': 1 }] },
      { 'cells': [{ 'content': '内容1', 'colspan': 1, 'rowspan': 1 }, { 'content': '内容2', 'colspan': 1, 'rowspan': 1 }] }
    ];
    setTable(defaultTable);
  };

  // 检查单元格是否被选中
  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (!selectionRange) {
      return false;
    }

    const { startRow, startCol, endRow, endCol } = selectionRange;
    return rowIndex >= startRow && rowIndex <= endRow && colIndex >= startCol && colIndex <= endCol;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Table Editor</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Click and drag to select cells</span>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex border-b border-gray-200 bg-gray-50 p-2 gap-1 overflow-x-auto">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
            title="添加行"
          >
            <PlusCircle size={14} />
            <span>添加行</span>
          </button>
          <button
            onClick={handleDeleteRow}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
            title="删除行"
          >
            <MinusCircle size={14} />
            <span>删除行</span>
          </button>
          <button
            onClick={handleAddColumn}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
            title="添加列"
          >
            <PlusCircle size={14} />
            <span>添加列</span>
          </button>
          <button
            onClick={handleDeleteColumn}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
            title="删除列"
          >
            <MinusCircle size={14} />
            <span>删除列</span>
          </button>
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          <button
            onClick={handleMergeCells}
            disabled={!selectionRange}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectionRange ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 cursor-not-allowed text-gray-500'}`}
            title="合并单元格"
          >
            <MoreHorizontal size={14} />
            <span>合并单元格</span>
          </button>
          <button
            onClick={() => selectedCell && handleSplitCell(selectedCell.row, selectedCell.col)}
            disabled={!selectedCell}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedCell ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 cursor-not-allowed text-gray-500'}`}
            title="拆分单元格"
          >
            <MoreHorizontal size={14} />
            <span>拆分单元格</span>
          </button>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 表格编辑器 */}
            <div className="flex-1">
              <div className="mb-2 text-sm font-medium text-gray-700">Table Editor</div>
              <div
                className="border border-gray-300 rounded-md overflow-hidden"
                onMouseLeave={handleMouseLeaveTable}
              >
                <table className="w-full border-collapse">
                  <tbody>
                    {table.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.cells.map((cell, colIndex) => (
                          <td
                            key={colIndex}
                            className={`border border-gray-300 p-1 ${isCellSelected(rowIndex, colIndex) ? 'bg-blue-100 dark:bg-blue-900/30' : ''} ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                            style={{
                              'minWidth': '100px',
                              'minHeight': '40px',
                              'width': cell.colspan > 1 ? `${cell.colspan * 100}px` : '100px',
                              'height': cell.rowspan > 1 ? `${cell.rowspan * 40}px` : '40px'
                            }}
                          >
                            {cell.colspan > 0 && cell.rowspan > 0 && (
                              <textarea
                                value={cell.content}
                                onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                className="w-full h-full p-2 border-none resize-none focus:outline-none"
                                placeholder="单元格内容"
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Markdown预览 */}
            <div className="flex-1">
              <div className="mb-2 text-sm font-medium text-gray-700">Markdown Preview</div>
              <div className="p-4 bg-gray-50 border border-gray-300 rounded-md">
                <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap">{tableMarkdown}</pre>
              </div>

              {/* 渲染预览 */}
              <div className="mt-4">
                <div className="mb-2 text-sm font-medium text-gray-700">Rendered Preview</div>
                <div className="p-4 bg-gray-50 border border-gray-300 rounded-md">
                  <table className="w-full border-collapse">
                    <thead>
                      {table.length > 0 && table[0] && table[0].cells && Array.isArray(table[0].cells) && (
                        <tr>
                          {table[0].cells.map((cell, index) => (
                            <th key={index} className="border border-gray-300 p-2 bg-gray-100 font-semibold">
                              {cell.content}
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {table.slice(1).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.cells.map((cell, colIndex) => (
                            <td key={colIndex} className="border border-gray-300 p-2">
                              {cell.content}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600"
              title="清除"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleInsert}
              className="flex items-center gap-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              插入表格
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
