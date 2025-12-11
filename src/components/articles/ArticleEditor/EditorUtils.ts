/**
 * 处理文本格式化
 * @param formatType 格式化类型
 * @param data 额外数据
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const handleFormat = (
  formatType: string,
  data: Record<string, unknown>,
  content: string,
  setContent: (content: string) => void,
  setLatexEditorOpen?: (open: boolean) => void,
  setSelectedText?: (text: string) => void,
  showNotification?: (message: string, type: 'success' | 'info' | 'error') => void
) => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = content.substring(start, end);

  let newText = '';

  // 表格操作处理 - 增强版
  const tableInfo = getCurrentTable(content);
  if (tableInfo) {
    switch (formatType) {
      case 'table-add-row':
        addTableRow(content, setContent);
        showNotification?.('已添加表格行', 'success');
        return;
      case 'table-add-column':
        addTableColumn(content, setContent);
        showNotification?.('已添加表格列', 'success');
        return;
      case 'table-delete-row':
        deleteTableRow(content, setContent);
        showNotification?.('已删除表格行', 'success');
        return;
      case 'table-delete-column':
        deleteTableColumn(content, setContent);
        showNotification?.('已删除表格列', 'success');
        return;
      case 'table-merge-cells':
        mergeTableCells(content, setContent);
        showNotification?.('已合并表格单元格', 'success');
        return;
    }
  }

  // 图片操作处理 - 增强版
  const imageInfo = getCurrentImage(content);
  if (imageInfo) {
    switch (formatType) {
      case 'edit-alt':
        editImageAlt(content, setContent);
        showNotification?.('已更新图片描述', 'success');
        return;
      case 'align-left':
        alignImage('left', content, setContent);
        showNotification?.('已设置图片左对齐', 'success');
        return;
      case 'align-center':
        alignImage('center', content, setContent);
        showNotification?.('已设置图片居中对齐', 'success');
        return;
      case 'align-right':
        alignImage('right', content, setContent);
        showNotification?.('已设置图片右对齐', 'success');
        return;
      case 'resize-small':
        resizeImage(200, content, setContent);
        showNotification?.('已调整图片为小尺寸', 'success');
        return;
      case 'resize-medium':
        resizeImage(400, content, setContent);
        showNotification?.('已调整图片为中尺寸', 'success');
        return;
      case 'resize-large':
        resizeImage(600, content, setContent);
        showNotification?.('已调整图片为大尺寸', 'success');
        return;
      case 'resize-custom':
        resizeImageCustom(content, setContent);
        showNotification?.('已调整图片尺寸', 'success');
        return;
    }
  }

  // 视频操作处理 - 增强版
  const videoInfo = getCurrentVideo(content);
  if (videoInfo) {
    switch (formatType) {
      case 'align-left':
        alignVideo('left', content, setContent);
        showNotification?.('已设置视频左对齐', 'success');
        return;
      case 'align-center':
        alignVideo('center', content, setContent);
        showNotification?.('已设置视频居中对齐', 'success');
        return;
      case 'align-right':
        alignVideo('right', content, setContent);
        showNotification?.('已设置视频右对齐', 'success');
        return;
      case 'resize-small':
        resizeVideo(400, content, setContent);
        showNotification?.('已调整视频为小尺寸', 'success');
        return;
      case 'resize-medium':
        resizeVideo(600, content, setContent);
        showNotification?.('已调整视频为中尺寸', 'success');
        return;
      case 'resize-large':
        resizeVideo(800, content, setContent);
        showNotification?.('已调整视频为大尺寸', 'success');
        return;
      case 'resize-custom':
        resizeVideoCustom(content, setContent);
        showNotification?.('已调整视频尺寸', 'success');
        return;
    }
  }

  switch (formatType) {
    case 'bold':
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        newText = selectedText.substring(2, selectedText.length - 2);
      } else {
        newText = `**${selectedText || '加粗文本'}**`;
      }
      break;
    case 'italic':
      if (selectedText.startsWith('*') && selectedText.endsWith('*')) {
        newText = selectedText.substring(1, selectedText.length - 1);
      } else {
        newText = `*${selectedText || '斜体文本'}*`;
      }
      break;
    case 'strikethrough':
      if (selectedText.startsWith('~~') && selectedText.endsWith('~~')) {
        newText = selectedText.substring(2, selectedText.length - 2);
      } else {
        newText = `~~${selectedText || '删除线文本'}~~`;
      }
      break;
    case 'code':
      if (selectedText.startsWith('`') && selectedText.endsWith('`')) {
        newText = selectedText.substring(1, selectedText.length - 1);
      } else {
        newText = `\`${selectedText || '代码'}\``;
      }
      break;
    case 'h1':
      newText = `# ${selectedText || '一级标题'}`;
      break;
    case 'h2':
      newText = `## ${selectedText || '二级标题'}`;
      break;
    case 'h3':
      newText = `### ${selectedText || '三级标题'}`;
      break;
    case 'h4':
      newText = `#### ${selectedText || '四级标题'}`;
      break;
    case 'h5':
      newText = `##### ${selectedText || '五级标题'}`;
      break;
    case 'h6':
      newText = `###### ${selectedText || '六级标题'}`;
      break;
    case 'ul':
      newText = `- ${selectedText || '列表项'}`;
      break;
    case 'ol':
      newText = `1. ${selectedText || '列表项'}`;
      break;
    case 'quote':
      newText = `> ${selectedText || '引用文本'}`;
      break;
    case 'link':
      if (selectedText) {
        newText = `[${selectedText}](https://example.com)`;
      } else {
        newText = '[链接文本](https://example.com)';
      }
      break;
    case 'image':
      const imageUrl = data?.url || 'https://via.placeholder.com/400x300';
      newText = `![图片描述](${imageUrl})`;
      break;
    case 'file':
      const fileUrl = data?.url || 'https://example.com/file.pdf';
      const fileName = data?.name || '文件';
      newText = `[${fileName}](${fileUrl})`;
      break;
    case 'video':
      const videoId = prompt('请输入YouTube视频ID:', 'dQw4w9WgXcQ') || 'dQw4w9WgXcQ';
      newText = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      break;
    case 'table':
      // 支持自定义表格尺寸
      const rows = Number(data?.rows) || 2;
      const cols = Number(data?.cols) || 2;
      let tableText = `| ${'标题 '.repeat(cols).trim().replace(/ /g, ' | ')} |\n`;
      tableText += `| ${':--- '.repeat(cols).trim().replace(/ /g, ' | ')} |\n`;
      for (let i = 0; i < rows - 1; i++) {
        tableText += `| ${'内容 '.repeat(cols).trim().replace(/ /g, ' | ')} |\n`;
      }
      newText = tableText;
      break;
    case 'codeblock':
      const language = data?.language || 'plaintext';
      newText = `\`\`\`${language}\n${selectedText || '代码内容'}\n\`\`\``;
      break;
    case 'latex':
      // 打开LaTeX编辑器
      if (setLatexEditorOpen && setSelectedText) {
        setSelectedText(selectedText);
        setLatexEditorOpen(true);
      }
      return;
    case 'sympy-cell':
      newText = `\n\n[sympy-cell]\n# SymPy计算单元格\n# 示例: integrate(x**2, x)\n\n[/sympy-cell]\n\n`;
      break;
    case 'mermaid':
      newText = `\`\`\`mermaid\ngraph TD\n    A[开始] --> B{条件A}\n    B -->|是| C[结果A]\n    B -->|否| D[结果B]\n    C --> E[结束]\n    D --> E\n\`\`\``;
      break;
    case 'graph':
      newText = `\n\n[graph]\n{\n  "nodes": [\n    { "id": "node1", "title": "节点1", "connections": 1, "type": "concept" },\n    { "id": "node2", "title": "节点2", "connections": 1, "type": "concept" }\n  ],\n  "links": [\n    { "source": "node1", "target": "node2", "type": "related", "label": "关系", "weight": 1.0 }\n  ]\n}\n[/graph]\n\n`;
      break;
    case 'insert-citation':
      const citationId = prompt('请输入引用ID:', 'ref1') || 'ref1';
      newText = selectedText ? `[${selectedText}][${citationId}]` : `[^${citationId}]`;
      break;
    case 'generate-bibliography':
      // 生成参考文献
      const citations = content.match(/\[\^(.*?)\]/g) || [];
      const uniqueCitations = [...new Set(citations.map(c => c.replace(/\[\^|\]/g, '')))];
      if (uniqueCitations.length > 0) {
        let bibliography = '\n## 参考文献\n\n';
        uniqueCitations.forEach((citation, index) => {
          bibliography += `${index + 1}. [${citation}]() - 引用来源\n`;
        });
        newText = selectedText + bibliography;
      } else {
        newText = selectedText;
      }
      break;
    case 'hr':
      newText = '\n---\n';
      break;
    case 'align-left':
      newText = `<div style="text-align: left;">${selectedText || '左对齐文本'}</div>`;
      break;
    case 'align-center':
      newText = `<div style="text-align: center;">${selectedText || '居中对齐文本'}</div>`;
      break;
    case 'align-right':
      newText = `<div style="text-align: right;">${selectedText || '右对齐文本'}</div>`;
      break;
    case 'align-justify':
      newText = `<div style="text-align: justify;">${selectedText || '两端对齐文本'}</div>`;
      break;
    case 'task-list':
      newText = `- [ ] ${selectedText || '待办事项'}`;
      break;
    case 'task-list-done':
      newText = `- [x] ${selectedText || '已完成事项'}`;
      break;
    case 'definition-list':
      newText = `${selectedText || '术语'}\n: ${selectedText ? '定义' : '术语的定义'}`;
      break;
    case 'footnote':
      const footnoteId = prompt('请输入脚注ID:', 'footnote1') || 'footnote1';
      newText = `${selectedText}[^${footnoteId}]`;
      break;
    case 'highlight':
      newText = `==${selectedText || '高亮文本'}==`;
      break;
    case 'superscript':
      newText = `${selectedText}^${selectedText ? '上标' : 'sup'}^`;
      break;
    case 'subscript':
      newText = `${selectedText}~${selectedText ? '下标' : 'sub'}~`;
      break;
    case 'audio':
      const audioUrl = prompt('请输入音频URL:', 'https://example.com/audio.mp3') || 'https://example.com/audio.mp3';
      newText = `<audio controls src="${audioUrl}">您的浏览器不支持音频播放。</audio>`;
      break;
    case 'collapsible':
      newText = `<details>\n<summary>${selectedText || '可折叠区块'}</summary>\n${selectedText ? '' : '这里是可折叠内容。'}\n</details>`;
      break;
    case 'plantuml':
      newText = `\`\`\`plantuml\n@startuml\nAlice -> Bob: 你好\nBob --> Alice: 你好，Alice\n@enduml\n\`\`\``;
      break;
    case 'graphviz':
      newText = `\`\`\`graphviz\ndigraph G {\n    A -> B;\n    B -> C;\n    C -> A;\n}\n\`\`\``;
      break;
    case 'emoji':
      newText = `${selectedText || ''}:smile: ${selectedText || ''}`;
      break;
    case 'autolink':
      newText = `${selectedText || 'https://example.com'}`;
      break;
    case 'email-link':
      newText = `<${selectedText || 'example@example.com'}>`;
      break;
    case 'math-numbered':
      const equationNumber = prompt('请输入公式编号:', '1') || '1';
      newText = `$$\n${selectedText || 'E = mc^2'}\n$$\\tag{${equationNumber}}`;
      break;
    case 'undo':
      // 触发浏览器的撤销操作
      textarea.focus();
      document.execCommand('undo');
      return;
    case 'redo':
      // 触发浏览器的重做操作
      textarea.focus();
      document.execCommand('redo');
      return;
    default:
      newText = selectedText;
  }

  const newValue = content.substring(0, start) + newText + content.substring(end);
  setContent(newValue);

  // 重新聚焦并设置光标位置到格式化文本末尾
  setTimeout(() => {
    textarea.focus();
    const newCursorPos = start + newText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
};

/**
 * 插入LaTeX公式到编辑器
 * @param formula LaTeX公式
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const insertLatexFormula = (
  formula: string,
  content: string,
  setContent: (content: string) => void
) => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 智能判断是否需要添加 $$ 包装（如果公式已经有包装则不重复添加）
    let formattedFormula = formula;
    const trimmedFormula = formula.trim();
    if (!trimmedFormula.startsWith('$') && !trimmedFormula.startsWith('\\')) {
      formattedFormula = `$$${formula}$$`;
    }

    const newValue = content.substring(0, start) + formattedFormula + content.substring(end);
    setContent(newValue);

    // 重新聚焦并设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formattedFormula.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  } else {
    setContent(content + `$$${formula}$$`);
  }
};

/**
 * 检测选中文本的格式类型
 * @param selectedText 选中文本
 * @returns 格式类型或null
 */
export const detectTextFormat = (selectedText: string): string | null => {
  // 简单的格式检测逻辑，实际应用中可以更复杂
  if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
    return 'bold';
  } else if (selectedText.startsWith('*') && selectedText.endsWith('*')) {
    return 'italic';
  } else if (selectedText.startsWith('~~') && selectedText.endsWith('~~')) {
    return 'strikethrough';
  } else if (selectedText.startsWith('`') && selectedText.endsWith('`')) {
    return 'code';
  }
  return null;
};

/**
 * 复制选中文本的格式
 * @param content 当前编辑器内容
 * @returns 复制的格式类型或null
 */
export const copyFormat = (content: string): string | null => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) return null;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = content.substring(start, end);

  if (!selectedText) {
    return null;
  }

  return detectTextFormat(selectedText);
};

/**
 * 粘贴格式到选中文本
 * @param formatType 要粘贴的格式类型
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const pasteFormat = (formatType: string, content: string, setContent: (content: string) => void) => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = content.substring(start, end);

  if (!selectedText) {
    return;
  }

  let formattedText = '';
  
  switch (formatType) {
    case 'bold':
      formattedText = `**${selectedText}**`;
      break;
    case 'italic':
      formattedText = `*${selectedText}*`;
      break;
    case 'strikethrough':
      formattedText = `~~${selectedText}~~`;
      break;
    case 'code':
      formattedText = `\`${selectedText}\``;
      break;
    default:
      return;
  }

  const newValue = content.substring(0, start) + formattedText + content.substring(end);
  setContent(newValue);
};

/**
 * 生成文章目录
 * @param content 当前编辑器内容
 * @returns 目录项数组
 */
/**
 * 获取当前光标所在的图片
 * @returns 图片的起始和结束位置，以及图片内容
 */
export const getCurrentImage = (content: string): { imageStart: number; imageEnd: number; imageContent: string } | null => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) return null;

  const cursorPos = textarea.selectionStart;
  
  // 查找当前行
  let currentLineStart = cursorPos;
  while (currentLineStart > 0 && content[currentLineStart - 1] !== '\n') {
    currentLineStart--;
  }
  
  let currentLineEnd = cursorPos;
  while (currentLineEnd < content.length && content[currentLineEnd] !== '\n') {
    currentLineEnd++;
  }
  
  const currentLine = content.substring(currentLineStart, currentLineEnd);
  
  // 查找图片 markdown 语法
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  let match;
  let imageStart = -1;
  let imageEnd = -1;
  let imageContent = '';
  
  while ((match = imageRegex.exec(currentLine)) !== null) {
    const start = currentLineStart + match.index;
    const end = start + match[0].length;
    
    if (start <= cursorPos && end >= cursorPos) {
      imageStart = start;
      imageEnd = end;
      imageContent = match[0];
      break;
    }
  }
  
  if (imageStart === -1) return null;
  
  return { imageStart, imageEnd, imageContent };
};

/**
 * 编辑图片alt文本
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const editImageAlt = (content: string, setContent: (content: string) => void) => {
  const imageInfo = getCurrentImage(content);
  if (!imageInfo) return;
  
  const { imageContent } = imageInfo;
  const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) return;
  
  const currentAlt = match[1];
  const newAlt = prompt('Enter new alt text:', currentAlt) || currentAlt;
  
  const updatedImage = `![${newAlt}](${match[2]})`;
  const newValue = content.substring(0, imageInfo.imageStart) + updatedImage + content.substring(imageInfo.imageEnd);
  setContent(newValue);
};

/**
 * 对齐图片
 * @param alignment 对齐方式
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const alignImage = (alignment: 'left' | 'center' | 'right', content: string, setContent: (content: string) => void) => {
  const imageInfo = getCurrentImage(content);
  if (!imageInfo) return;
  
  const { imageContent } = imageInfo;
  
  // 使用HTML img标签实现对齐
  const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) return;
  
  const alt = match[1];
  const src = match[2];
  
  const alignClass = {
    left: 'float-left mr-4',
    center: 'mx-auto block',
    right: 'float-right ml-4'
  };
  
  const updatedImage = `<img src="${src}" alt="${alt}" class="${alignClass[alignment]}" />`;
  const newValue = content.substring(0, imageInfo.imageStart) + updatedImage + content.substring(imageInfo.imageEnd);
  setContent(newValue);
};

/**
 * 调整图片大小
 * @param width 图片宽度
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const resizeImage = (width: number, content: string, setContent: (content: string) => void) => {
  const imageInfo = getCurrentImage(content);
  if (!imageInfo) return;
  
  const { imageContent } = imageInfo;
  
  // 使用HTML img标签实现大小调整
  const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) return;
  
  const alt = match[1];
  const src = match[2];
  
  const updatedImage = `<img src="${src}" alt="${alt}" width="${width}" />`;
  const newValue = content.substring(0, imageInfo.imageStart) + updatedImage + content.substring(imageInfo.imageEnd);
  setContent(newValue);
};

/**
 * 自定义调整图片大小
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const resizeImageCustom = (content: string, setContent: (content: string) => void) => {
  const imageInfo = getCurrentImage(content);
  if (!imageInfo) return;
  
  const { imageContent } = imageInfo;
  const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) return;
  
  const alt = match[1];
  const src = match[2];
  
  const widthStr = prompt('Enter image width (px):', '400');
  if (!widthStr) return;
  
  const width = parseInt(widthStr, 10);
  if (isNaN(width) || width <= 0) return;
  
  const updatedImage = `<img src="${src}" alt="${alt}" width="${width}" />`;
  const newValue = content.substring(0, imageInfo.imageStart) + updatedImage + content.substring(imageInfo.imageEnd);
  setContent(newValue);
};

/**
 * 获取当前光标所在的表格
 * @param content 当前编辑器内容
 * @returns 表格的起始和结束位置，以及表格内容
 */
export const getCurrentTable = (content: string): { tableStart: number; tableEnd: number; tableContent: string } | null => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) return null;

  const cursorPos = textarea.selectionStart;
  const text = content;
  
  // 查找当前行
  let currentLineStart = cursorPos;
  while (currentLineStart > 0 && text[currentLineStart - 1] !== '\n') {
    currentLineStart--;
  }
  
  let currentLineEnd = cursorPos;
  while (currentLineEnd < text.length && text[currentLineEnd] !== '\n') {
    currentLineEnd++;
  }
  
  // 检查当前行是否是表格行
  const currentLine = text.substring(currentLineStart, currentLineEnd);
  const isTableRow = /^\|.*\|$/.test(currentLine);
  if (!isTableRow) return null;
  
  // 查找表格的起始位置
  let tableStart = currentLineStart;
  while (tableStart > 0) {
    let prevLineStart = tableStart - 1;
    while (prevLineStart > 0 && text[prevLineStart - 1] !== '\n') {
      prevLineStart--;
    }
    
    // 处理边界条件，当tableStart为0时
    const prevLine = tableStart > 0 ? text.substring(prevLineStart, tableStart - 1) : '';
    const isPrevLineTableRow = tableStart > 0 && (/^\|.*\|$/.test(prevLine) || /^\|[-:]*\|[-:]*\|$/.test(prevLine));
    
    if (!isPrevLineTableRow) {
      break;
    }
    tableStart = prevLineStart;
  }
  
  // 查找表格的结束位置
  let tableEnd = currentLineEnd + 1;
  while (tableEnd < text.length) {
    let nextLineEnd = tableEnd;
    while (nextLineEnd < text.length && text[nextLineEnd] !== '\n') {
      nextLineEnd++;
    }
    
    const nextLine = text.substring(tableEnd, nextLineEnd);
    if (!/^\|.*\|$/.test(nextLine) && !/^\|[-:]*\|[-:]*\|$/.test(nextLine)) {
      break;
    }
    tableEnd = nextLineEnd + 1;
  }
  
  const tableContent = text.substring(tableStart, tableEnd);
  return { tableStart, tableEnd, tableContent };
};

/**
 * 添加表格行
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const addTableRow = (content: string, setContent: (content: string) => void) => {
  const tableInfo = getCurrentTable(content);
  if (!tableInfo) return;
  
  const { tableContent } = tableInfo;
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return;
  
  // 找到分隔线位置
  const separatorIndex = lines.findIndex(line => /^\|[-:]*\|[-:]*\|$/.test(line));
  if (separatorIndex === -1 || lines.length === 0 || !lines[0]) return;
  
  // 获取列数
  const columns = lines[0].split('|').filter(col => col.trim() !== '').length;
  
  // 创建新行
  const newRow = `| ${'Cell '.repeat(columns).trim().replace(/ /g, ' | ')} |`;
  
  // 插入新行（在分隔线后）
  const newLines = [...lines];
  newLines.splice(separatorIndex + 1, 0, newRow);
  
  const updatedTable = newLines.join('\n');
  const newValue = content.substring(0, tableInfo.tableStart) + updatedTable + content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

/**
 * 添加表格列
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const addTableColumn = (content: string, setContent: (content: string) => void) => {
  const tableInfo = getCurrentTable(content);
  if (!tableInfo) return;
  
  const { tableContent } = tableInfo;
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return;
  
  // 更新每一行，添加新列
  const newLines = lines.map(line => {
    if (/^\|[-:]*\|[-:]*\|$/.test(line)) {
      // 分隔线行
      return line.replace(/\|$/, '|-|');
    } else {
      // 数据行
      return line.replace(/\|$/, '| Cell |');
    }
  });
  
  const updatedTable = newLines.join('\n');
  const newValue = content.substring(0, tableInfo.tableStart) + updatedTable + content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

/**
 * 删除表格行
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const deleteTableRow = (content: string, setContent: (content: string) => void) => {
  const tableInfo = getCurrentTable(content);
  if (!tableInfo) return;
  
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) return;
  
  const { tableContent, tableStart } = tableInfo;
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 3) return; // 至少保留标题、分隔线和一行数据
  
  const selectionStart = textarea.selectionStart;
  const cursorPos = selectionStart - tableStart;
  if (cursorPos < 0) return;
  
  const currentLine = tableContent.substring(0, cursorPos).split('\n').length - 1;
  if (currentLine < 0 || currentLine >= lines.length) return;
  
  // 不能删除分隔线
  const separatorIndex = lines.findIndex(line => /^\|[-:]*\|[-:]*\|$/.test(line));
  if (separatorIndex === -1 || currentLine === separatorIndex) return;
  
  const newLines = [...lines];
  newLines.splice(currentLine, 1);
  
  const updatedTable = newLines.join('\n');
  const newValue = content.substring(0, tableInfo.tableStart) + updatedTable + content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

/**
 * 删除表格列
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const deleteTableColumn = (content: string, setContent: (content: string) => void) => {
  const tableInfo = getCurrentTable(content);
  if (!tableInfo) return;
  
  const { tableContent } = tableInfo;
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2 || !lines[0]) return;
  
  // 获取列数
  const columns = lines[0].split('|').filter(col => col.trim() !== '').length;
  if (columns <= 1) return; // 至少保留一列
  
  // 更新每一行，删除最后一列
  const newLines = lines.map(line => {
    const parts = line.split('|').filter(col => col.trim() !== '');
    parts.pop();
    return `| ${parts.join(' | ')} |`;
  });
  
  const updatedTable = newLines.join('\n');
  const newValue = content.substring(0, tableInfo.tableStart) + updatedTable + content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

/**
 * 合并表格单元格
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const mergeTableCells = (content: string, setContent: (content: string) => void) => {
  const tableInfo = getCurrentTable(content);
  if (!tableInfo) return;
  
  // 简单实现：在选中的单元格中添加合并标记
  // 实际Markdown不支持合并单元格，这里使用HTML表格实现
  const { tableContent } = tableInfo;
  
  // 替换为HTML表格（简化实现）
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2 || !lines[0]) return;
  
  // 解析表格数据
  const separatorIndex = lines.findIndex(line => /^\|[-:]*\|[-:]*\|$/.test(line));
  if (separatorIndex === -1) return;
  
  const headers = lines[0].split('|').filter(col => col.trim() !== '').map(col => col.trim());
  const dataRows = lines.slice(separatorIndex + 1).map(row => 
    row.split('|').filter(col => col.trim() !== '').map(col => col.trim())
  );
  
  // 生成HTML表格
  let htmlTable = '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse;">\n';
  htmlTable += '  <thead>\n    <tr>\n';
  headers.forEach(header => {
    htmlTable += `      <th>${header}</th>\n`;
  });
  htmlTable += '    </tr>\n  </thead>\n  <tbody>\n';
  
  dataRows.forEach(row => {
    htmlTable += '    <tr>\n';
    row.forEach(cell => {
      htmlTable += `      <td>${cell}</td>\n`;
    });
    htmlTable += '    </tr>\n';
  });
  
  htmlTable += '  </tbody>\n</table>';
  
  const newValue = content.substring(0, tableInfo.tableStart) + htmlTable + content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

/**
 * 获取当前光标所在的视频
 * @param content 当前编辑器内容
 * @returns 视频的起始和结束位置，以及视频内容
 */
export const getCurrentVideo = (content: string): { videoStart: number; videoEnd: number; videoContent: string } | null => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) return null;

  const cursorPos = textarea.selectionStart;
  const text = content;
  
  // 查找当前行
  let currentLineStart = cursorPos;
  while (currentLineStart > 0 && text[currentLineStart - 1] !== '\n') {
    currentLineStart--;
  }
  
  let currentLineEnd = cursorPos;
  while (currentLineEnd < text.length && text[currentLineEnd] !== '\n') {
    currentLineEnd++;
  }
  
  const currentLine = text.substring(currentLineStart, currentLineEnd);
  
  // 查找视频嵌入代码
  const videoRegex = /<iframe.*?src="(.*?)".*?><\/iframe>/g;
  let match;
  let videoStart = -1;
  let videoEnd = -1;
  let videoContent = '';
  
  while ((match = videoRegex.exec(currentLine)) !== null) {
    const start = currentLineStart + match.index;
    const end = start + match[0].length;
    
    if (start <= cursorPos && end >= cursorPos) {
      videoStart = start;
      videoEnd = end;
      videoContent = match[0];
      break;
    }
  }
  
  if (videoStart === -1) return null;
  
  return { videoStart, videoEnd, videoContent };
};

/**
 * 对齐视频
 * @param alignment 对齐方式
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const alignVideo = (alignment: 'left' | 'center' | 'right', content: string, setContent: (content: string) => void) => {
  const videoInfo = getCurrentVideo(content);
  if (!videoInfo) return;
  
  const { videoContent } = videoInfo;
  
  // 使用HTML div标签实现对齐
  const alignClass = {
    left: 'float-left mr-4',
    center: 'mx-auto block',
    right: 'float-right ml-4'
  };
  
  const updatedVideo = `<div class="${alignClass[alignment]}">${videoContent}</div>`;
  const newValue = content.substring(0, videoInfo.videoStart) + updatedVideo + content.substring(videoInfo.videoEnd);
  setContent(newValue);
};

/**
 * 调整视频大小
 * @param width 视频宽度
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const resizeVideo = (width: number, content: string, setContent: (content: string) => void) => {
  const videoInfo = getCurrentVideo(content);
  if (!videoInfo) return;
  
  const { videoContent } = videoInfo;
  
  // 更新iframe宽度
  const updatedVideo = videoContent.replace(/width="(.*?)"/, `width="${width}"`).replace(/height="(.*?)"/, `height="${Math.round(width * 9 / 16)}"`);
  const newValue = content.substring(0, videoInfo.videoStart) + updatedVideo + content.substring(videoInfo.videoEnd);
  setContent(newValue);
};

/**
 * 自定义调整视频大小
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const resizeVideoCustom = (content: string, setContent: (content: string) => void) => {
  const videoInfo = getCurrentVideo(content);
  if (!videoInfo) return;
  
  const widthStr = prompt('Enter video width (px):', '600');
  if (!widthStr) return;
  
  const width = parseInt(widthStr, 10);
  if (isNaN(width) || width <= 0) return;
  
  resizeVideo(width, content, setContent);
};

export const generateTableOfContents = (content: string) => {
  // 从内容中提取标题
  const headings = content.split('\n').filter(line => /^#{1,6}\s+/.test(line));
  
  interface TableOfContentsItem {
    id: string;
    text: string;
    level: number;
    children: TableOfContentsItem[];
  }
  
  const tocItems: TableOfContentsItem[] = [];
  const headingStack: TableOfContentsItem[] = [];
  
  headings.forEach(line => {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match && match[1] && match[2]) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const tocItem: TableOfContentsItem = {
        id,
        text,
        level,
        children: []
      };
      
      // 构建嵌套目录结构
      if (level === 1) {
        tocItems.push(tocItem);
        headingStack.length = 0;
        headingStack.push(tocItem);
      } else {
        while (headingStack.length > 0) {
          const lastItem = headingStack[headingStack.length - 1];
          if (lastItem && lastItem.level < level) {
            lastItem.children.push(tocItem);
            headingStack.push(tocItem);
            break;
          } else {
            headingStack.pop();
          }
        }
        
        if (headingStack.length === 0) {
          tocItems.push(tocItem);
          headingStack.push(tocItem);
        }
      }
    }
  });
  
  return tocItems;
};

/**
 * 插入知识图表到编辑器
 * @param graphMarkdown 知识图表的Markdown字符串
 * @param content 当前编辑器内容
 * @param setContent 设置编辑器内容的函数
 */
export const insertGraphMarkdown = (
  graphMarkdown: string,
  content: string,
  setContent: (content: string) => void
) => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newValue = content.substring(0, start) + graphMarkdown + content.substring(end);
    setContent(newValue);

    // 重新聚焦并设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + graphMarkdown.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  } else {
    setContent(content + graphMarkdown);
  }
};