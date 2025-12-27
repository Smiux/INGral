

// 辅助函数：获取当前光标所在的表格
export const getCurrentTable = (content: string): { tableStart: number; tableEnd: number; tableContent: string } | null => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) {
    return null;
  }

  const cursorPos = textarea.selectionStart;
  const text = content;

  // 查找当前行
  let currentLineStart = cursorPos;
  while (currentLineStart > 0 && text[currentLineStart - 1] !== '\n') {
    currentLineStart -= 1;
  }

  let currentLineEnd = cursorPos;
  while (currentLineEnd < text.length && text[currentLineEnd] !== '\n') {
    currentLineEnd += 1;
  }

  // 检查当前行是否是表格行
  const currentLine = text.substring(currentLineStart, currentLineEnd);
  const isTableRow = (/^\|.*\|$/).test(currentLine);
  if (!isTableRow) {
    return null;
  }

  // 查找表格的起始位置
  let tableStart = currentLineStart;
  while (tableStart > 0) {
    let prevLineStart = tableStart - 1;
    while (prevLineStart > 0 && text[prevLineStart - 1] !== '\n') {
      prevLineStart -= 1;
    }

    // 处理边界条件，当tableStart为0时
    const prevLine = tableStart > 0 ? text.substring(prevLineStart, tableStart - 1) : '';
    const isPrevLineTableRow = tableStart > 0 && ((/^\|.*\|$/).test(prevLine) || (/^\|[-:]*\|[-:]*\|$/).test(prevLine));

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
      nextLineEnd += 1;
    }

    const nextLine = text.substring(tableEnd, nextLineEnd);
    if (!(/^\|.*\|$/).test(nextLine) && !(/^\|[-:]*\|[-:]*\|$/).test(nextLine)) {
      break;
    }
    tableEnd = nextLineEnd + 1;
  }

  const tableContent = text.substring(tableStart, tableEnd);
  return { tableStart, tableEnd, tableContent };
};

// 辅助函数：添加表格行
export const addTableRow = (_content: string, setContent: (_content: string) => void) => {
  const tableInfo = getCurrentTable(_content);
  if (!tableInfo) {
    return;
  }

  const { tableContent } = tableInfo;
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return;
  }

  // 找到分隔线位置
  const separatorIndex = lines.findIndex(line => (/^\|[-:]*\|[-:]*\|$/).test(line));
  if (separatorIndex === -1 || lines.length === 0 || !lines[0]) {
    return;
  }

  // 获取列数
  const columns = lines[0].split('|').filter(col => col.trim() !== '').length;

  // 创建新行
  const newRow = `| ${'Cell '.repeat(columns).trim()
    .replace(/ /g, ' | ')} |`;

  // 插入新行（在分隔线后）
  const newLines = [...lines];
  newLines.splice(separatorIndex + 1, 0, newRow);

  const updatedTable = newLines.join('\n');
  const newValue = _content.substring(0, tableInfo.tableStart) + updatedTable + _content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

// 辅助函数：添加表格列
export const addTableColumn = (_content: string, setContent: (_content: string) => void) => {
  const tableInfo = getCurrentTable(_content);
  if (!tableInfo) {
    return;
  }

  const { tableContent } = tableInfo;
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return;
  }

  // 更新每一行，添加新列
  const newLines = lines.map(line => {
    if ((/^\|[-:]*\|[-:]*\|$/).test(line)) {
      // 分隔线行
      return line.replace(/\|$/, '|-|');
    }
    // 数据行
    return line.replace(/\|$/, '| Cell |');
  });

  const updatedTable = newLines.join('\n');
  const newValue = _content.substring(0, tableInfo.tableStart) + updatedTable + _content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

// 辅助函数：删除表格行
export const deleteTableRow = (_content: string, setContent: (_content: string) => void) => {
  const tableInfo = getCurrentTable(_content);
  if (!tableInfo) {
    return;
  }

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) {
    return;
  }

  const { tableContent, tableStart } = tableInfo;
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  // 至少保留标题、分隔线和一行数据
  if (lines.length < 3) {
    return;
  }

  const selectionStart = textarea.selectionStart;
  const cursorPos = selectionStart - tableStart;
  if (cursorPos < 0) {
    return;
  }

  const currentLine = tableContent.substring(0, cursorPos).split('\n').length - 1;
  if (currentLine < 0 || currentLine >= lines.length) {
    return;
  }

  // 不能删除分隔线
  const separatorIndex = lines.findIndex(line => (/^\|[-:]*\|[-:]*\|$/).test(line));
  if (separatorIndex === -1 || currentLine === separatorIndex) {
    return;
  }

  const newLines = [...lines];
  newLines.splice(currentLine, 1);

  const updatedTable = newLines.join('\n');
  const newValue = _content.substring(0, tableInfo.tableStart) + updatedTable + _content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

// 辅助函数：删除表格列
export const deleteTableColumn = (_content: string, setContent: (_content: string) => void) => {
  const tableInfo = getCurrentTable(_content);
  if (!tableInfo) {
    return;
  }

  const { tableContent } = tableInfo;
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2 || !lines[0]) {
    return;
  }

  // 获取列数
  const columns = lines[0].split('|').filter(col => col.trim() !== '').length;
  // 至少保留一列
  if (columns <= 1) {
    return;
  }

  // 更新每一行，删除最后一列
  const newLines = lines.map(line => {
    const parts = line.split('|').filter(col => col.trim() !== '');
    parts.pop();
    return `| ${parts.join(' | ')} |`;
  });

  const updatedTable = newLines.join('\n');
  const newValue = _content.substring(0, tableInfo.tableStart) + updatedTable + _content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

// 辅助函数：合并表格单元格
export const mergeTableCells = (_content: string, setContent: (_content: string) => void) => {
  const tableInfo = getCurrentTable(_content);
  if (!tableInfo) {
    return;
  }

  // 简单实现：在选中的单元格中添加合并标记
  // 实际Markdown不支持合并单元格，这里使用HTML表格实现
  const { tableContent } = tableInfo;

  // 替换为HTML表格（简化实现）
  const lines = tableContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2 || !lines[0]) {
    return;
  }

  // 解析表格数据
  const separatorIndex = lines.findIndex(line => (/^\|[-:]*\|[-:]*\|$/).test(line));
  if (separatorIndex === -1) {
    return;
  }

  const headers = lines[0].split('|').filter(col => col.trim() !== '')
    .map(col => col.trim());
  const dataRows = lines.slice(separatorIndex + 1).map(row =>
    row.split('|').filter(col => col.trim() !== '')
      .map(col => col.trim())
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

  const newValue = _content.substring(0, tableInfo.tableStart) + htmlTable + _content.substring(tableInfo.tableEnd);
  setContent(newValue);
};

// 辅助函数：获取当前光标所在的图片
export const getCurrentImage = (_content: string): { imageStart: number; imageEnd: number; imageContent: string } | null => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) {
    return null;
  }

  const cursorPos = textarea.selectionStart;

  // 查找当前行
  let currentLineStart = cursorPos;
  while (currentLineStart > 0 && _content[currentLineStart - 1] !== '\n') {
    currentLineStart -= 1;
  }

  let currentLineEnd = cursorPos;
  while (currentLineEnd < _content.length && _content[currentLineEnd] !== '\n') {
    currentLineEnd += 1;
  }

  const currentLine = _content.substring(currentLineStart, currentLineEnd);

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

  if (imageStart === -1) {
    return null;
  }

  return { imageStart, imageEnd, imageContent };
};

// 辅助函数：编辑图片alt文本
export const editImageAlt = (_content: string, setContent: (_content: string) => void) => {
  const imageInfo = getCurrentImage(_content);
  if (!imageInfo) {
    return;
  }

  const { imageContent } = imageInfo;
  const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) {
    return;
  }

  // 图片alt文本编辑已移至专门的图片编辑器组件
  const currentAlt = match[1];
  const updatedImage = `![${currentAlt}](${match[2]})`;
  const newValue = _content.substring(0, imageInfo.imageStart) + updatedImage + _content.substring(imageInfo.imageEnd);
  setContent(newValue);
};

// 辅助函数：对齐图片
export const alignImage = (alignment: 'left' | 'center' | 'right', _content: string, setContent: (_content: string) => void) => {
  const imageInfo = getCurrentImage(_content);
  if (!imageInfo) {
    return;
  }

  const { imageContent } = imageInfo;

  // 使用HTML img标签实现对齐
  const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) {
    return;
  }

  const alt = match[1];
  const src = match[2];

  const alignClass = {
    'left': 'float-left mr-4',
    'center': 'mx-auto block',
    'right': 'float-right ml-4'
  };

  const updatedImage = `<img src="${src}" alt="${alt}" class="${alignClass[alignment]}" />`;
  const newValue = _content.substring(0, imageInfo.imageStart) + updatedImage + _content.substring(imageInfo.imageEnd);
  setContent(newValue);
};

// 辅助函数：调整图片大小
export const resizeImage = (width: number, _content: string, setContent: (_content: string) => void) => {
  const imageInfo = getCurrentImage(_content);
  if (!imageInfo) {
    return;
  }

  const { imageContent } = imageInfo;

  // 使用HTML img标签实现大小调整
  const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) {
    return;
  }

  const alt = match[1];
  const src = match[2];

  const updatedImage = `<img src="${src}" alt="${alt}" width="${width}" />`;
  const newValue = _content.substring(0, imageInfo.imageStart) + updatedImage + _content.substring(imageInfo.imageEnd);
  setContent(newValue);
};

// 辅助函数：自定义调整图片大小
export const resizeImageCustom = (_content: string, setContent: (_content: string) => void) => {
  const imageInfo = getCurrentImage(_content);
  if (!imageInfo) {
    return;
  }

  const { imageContent } = imageInfo;
  const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (!match) {
    return;
  }

  const alt = match[1];
  const src = match[2];

  // 图片大小调整已移至专门的图片编辑器组件
  const width = 400;

  const updatedImage = `<img src="${src}" alt="${alt}" width="${width}" />`;
  const newValue = _content.substring(0, imageInfo.imageStart) + updatedImage + _content.substring(imageInfo.imageEnd);
  setContent(newValue);
};

// 辅助函数：获取当前光标所在的视频
export const getCurrentVideo = (_content: string): { videoStart: number; videoEnd: number; videoContent: string } | null => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) {
    return null;
  }

  const cursorPos = textarea.selectionStart;
  const text = _content;

  // 查找当前行
  let currentLineStart = cursorPos;
  while (currentLineStart > 0 && text[currentLineStart - 1] !== '\n') {
    currentLineStart -= 1;
  }

  let currentLineEnd = cursorPos;
  while (currentLineEnd < text.length && text[currentLineEnd] !== '\n') {
    currentLineEnd += 1;
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

  if (videoStart === -1) {
    return null;
  }

  return { videoStart, videoEnd, videoContent };
};

// 辅助函数：对齐视频
export const alignVideo = (alignment: 'left' | 'center' | 'right', _content: string, setContent: (_content: string) => void) => {
  const videoInfo = getCurrentVideo(_content);
  if (!videoInfo) {
    return;
  }

  const { videoContent } = videoInfo;

  // 使用HTML div标签实现对齐
  const alignClass = {
    'left': 'float-left mr-4',
    'center': 'mx-auto block',
    'right': 'float-right ml-4'
  };

  const updatedVideo = `<div class="${alignClass[alignment]}">${videoContent}</div>`;
  const newValue = _content.substring(0, videoInfo.videoStart) + updatedVideo + _content.substring(videoInfo.videoEnd);
  setContent(newValue);
};

// 辅助函数：调整视频大小
export const resizeVideo = (width: number, _content: string, setContent: (_content: string) => void) => {
  const videoInfo = getCurrentVideo(_content);
  if (!videoInfo) {
    return;
  }

  const { videoContent } = videoInfo;

  // 更新iframe宽度
  const updatedVideo = videoContent.replace(/width="(.*?)"/, `width="${width}"`).replace(/height="(.*?)"/, `height="${Math.round(width * 9 / 16)}"`);
  const newValue = _content.substring(0, videoInfo.videoStart) + updatedVideo + _content.substring(videoInfo.videoEnd);
  setContent(newValue);
};

// 辅助函数：自定义调整视频大小
export const resizeVideoCustom = (_content: string, setContent: (_content: string) => void) => {
  const videoInfo = getCurrentVideo(_content);
  if (!videoInfo) {
    return;
  }

  // 视频大小调整已移至专门的视频编辑器组件
  const width = 600;

  resizeVideo(width, _content, setContent);
};

// 定义handleFormat函数的参数接口
export interface HandleFormatParams {
  formatType: string;
  data: Record<string, unknown>;
  content: string;
  setContent: (_content: string) => void;
  setLatexEditorOpen?: (_open: boolean) => void;
  setSelectedText?: (_text: string) => void;
  showNotification?: (_message: string, _type: 'success' | 'info' | 'error') => void;
}

export const handleFormat = (params: HandleFormatParams) => {
  const { formatType, 'data': _data, 'content': _content, setContent, setLatexEditorOpen, setSelectedText, showNotification } = params;
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) {
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = _content.substring(start, end);

  let newText = '';

  // 表格操作处理 - 增强版
  const tableInfo = getCurrentTable(_content);
  if (tableInfo) {
    switch (formatType) {
      case 'table-add-row':
        addTableRow(_content, setContent);
        showNotification?.('已添加表格行', 'success');
        return;
      case 'table-add-column':
        addTableColumn(_content, setContent);
        showNotification?.('已添加表格列', 'success');
        return;
      case 'table-delete-row':
        deleteTableRow(_content, setContent);
        showNotification?.('已删除表格行', 'success');
        return;
      case 'table-delete-column':
        deleteTableColumn(_content, setContent);
        showNotification?.('已删除表格列', 'success');
        return;
      case 'table-merge-cells':
        mergeTableCells(_content, setContent);
        showNotification?.('已合并表格单元格', 'success');
        return;
    }
  }

  // 图片操作处理 - 增强版
  const imageInfo = getCurrentImage(_content);
  if (imageInfo) {
    switch (formatType) {
      case 'edit-alt':
        editImageAlt(_content, setContent);
        showNotification?.('已更新图片描述', 'success');
        return;
      case 'align-left':
        alignImage('left', _content, setContent);
        showNotification?.('已设置图片左对齐', 'success');
        return;
      case 'align-center':
        alignImage('center', _content, setContent);
        showNotification?.('已设置图片居中对齐', 'success');
        return;
      case 'align-right':
        alignImage('right', _content, setContent);
        showNotification?.('已设置图片右对齐', 'success');
        return;
      case 'resize-small':
        resizeImage(200, _content, setContent);
        showNotification?.('已调整图片为小尺寸', 'success');
        return;
      case 'resize-medium':
        resizeImage(400, _content, setContent);
        showNotification?.('已调整图片为中尺寸', 'success');
        return;
      case 'resize-large':
        resizeImage(600, _content, setContent);
        showNotification?.('已调整图片为大尺寸', 'success');
        return;
      case 'resize-custom':
        resizeImageCustom(_content, setContent);
        showNotification?.('已调整图片尺寸', 'success');
        return;
    }
  }

  // 视频操作处理 - 增强版
  const videoInfo = getCurrentVideo(_content);
  if (videoInfo) {
    switch (formatType) {
      case 'align-left':
        alignVideo('left', _content, setContent);
        showNotification?.('已设置视频左对齐', 'success');
        return;
      case 'align-center':
        alignVideo('center', _content, setContent);
        showNotification?.('已设置视频居中对齐', 'success');
        return;
      case 'align-right':
        alignVideo('right', _content, setContent);
        showNotification?.('已设置视频右对齐', 'success');
        return;
      case 'resize-small':
        resizeVideo(400, _content, setContent);
        showNotification?.('已调整视频为小尺寸', 'success');
        return;
      case 'resize-medium':
        resizeVideo(600, _content, setContent);
        showNotification?.('已调整视频为中尺寸', 'success');
        return;
      case 'resize-large':
        resizeVideo(800, _content, setContent);
        showNotification?.('已调整视频为大尺寸', 'success');
        return;
      case 'resize-custom':
        resizeVideoCustom(_content, setContent);
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
      const imageUrl = _data?.url || 'https://via.placeholder.com/400x300';
      newText = `![图片描述](${imageUrl})`;
      break;
    case 'file':
      const fileUrl = _data?.url || 'https://example.com/file.pdf';
      const fileName = _data?.name || '文件';
      newText = `[${fileName}](${fileUrl})`;
      break;
    case 'video':
      // 视频ID输入已移至专门的视频编辑器组件
      newText = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      break;
    case 'table':
      // 支持自定义表格尺寸
      const rows = Number(_data?.rows) || 2;
      const cols = Number(_data?.cols) || 2;
      let tableText = `| ${'标题 '.repeat(cols).trim()
        .replace(/ /g, ' | ')} |\n`;
      tableText += `| ${':--- '.repeat(cols).trim()
        .replace(/ /g, ' | ')} |\n`;
      for (let i = 0; i < rows - 1; i += 1) {
        tableText += `| ${'内容 '.repeat(cols).trim()
          .replace(/ /g, ' | ')} |\n`;
      }
      newText = tableText;
      break;
    case 'codeblock':
      const language = _data?.language || 'plaintext';
      newText = `\`\`\`${language}\n${selectedText || '代码内容'}\n\`\`\``;
      break;
    case 'latex':
      // 打开LaTeX编辑器
      if (setLatexEditorOpen && setSelectedText) {
        setSelectedText(selectedText);
        setLatexEditorOpen(true);
      }
      return;
    case 'nerdamer-cell':
      newText = '\n\n[nerdamer-cell]\n# Nerdamer计算单元格\n# 示例: integrate(x^2, x) 或 diff(x^2, x)\n\n[/nerdamer-cell]\n\n';
      break;
    case 'mermaid':
      newText = '```mermaid\ngraph TD\n    A[开始] --> B{条件A}\n    B -->|是| C[结果A]\n    B -->|否| D[结果B]\n    C --> E[结束]\n    D --> E\n```';
      break;
    case 'insert-citation':
      // 引用ID输入已移至专门的引用编辑器组件
      newText = selectedText ? `[${selectedText}][ref1]` : '[^ref1]';
      break;
    case 'generate-bibliography':
      // 生成参考文献
      const citations = _content.match(/\[\^(.*?)\]/g) || [];
      const uniqueCitations = [...new Set(citations.map((c: string) => c.replace(/\[\^|\]/g, '')))];
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
      // 脚注ID输入已移至专门的脚注编辑器组件
      newText = `${selectedText}[^footnote1]`;
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
      // 音频URL输入已移至专门的音频编辑器组件
      newText = '<audio controls src="https://example.com/audio.mp3">您的浏览器不支持音频播放。</audio>';
      break;
    case 'collapsible':
      newText = `<details>\n<summary>${selectedText || '可折叠区块'}</summary>\n${selectedText ? '' : '这里是可折叠内容。'}\n</details>`;
      break;
    case 'plantuml':
      newText = '```plantuml\n@startuml\nAlice -> Bob: 你好\nBob --> Alice: 你好，Alice\n@enduml\n```';
      break;
    case 'graphviz':
      newText = '```graphviz\ndigraph G {\n    A -> B;\n    B -> C;\n    C -> A;\n}\n```';
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
      // 公式编号输入已移至专门的数学公式编辑器组件
      newText = `$$
${selectedText || 'E = mc^2'}
$$\tag{1}`;
      break;
    case 'chart-bar':
      newText = '\n```chart-bar\n{\n  "labels": ["一月", "二月", "三月", "四月", "五月", "六月"],\n  "datasets": [\n    {\n      "label": "数据集1",\n      "data": [65, 59, 80, 81, 56, 55],\n      "backgroundColor": "rgba(75, 192, 192, 0.5)",\n      "borderColor": "rgba(75, 192, 192, 1)",\n      "borderWidth": 1\n    }\n  ]\n}\n```\n';
      break;
    case 'chart-line':
      newText = '\n```chart-line\n{\n  "labels": ["一月", "二月", "三月", "四月", "五月", "六月"],\n  "datasets": [\n    {\n      "label": "数据集1",\n      "data": [65, 59, 80, 81, 56, 55],\n      "borderColor": "rgba(75, 192, 192, 1)",\n      "backgroundColor": "rgba(75, 192, 192, 0.1)",\n      "tension": 0.3\n    }\n  ]\n}\n```\n';
      break;
    case 'chart-pie':
      newText = '\n```chart-pie\n[\n  { "name": "直接访问", "value": 45 },\n  { "name": "搜索引擎", "value": 30 },\n  { "name": "社交媒体", "value": 15 },\n  { "name": "外部链接", "value": 10 }\n]\n```\n';
      break;
    case 'undo':
      // 撤销操作已由 HistoryManager 处理
      return;
    case 'redo':
      // 重做操作已由 HistoryManager 处理
      return;
    default:
      newText = selectedText;
  }

  const newValue = _content.substring(0, start) + newText + _content.substring(end);
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
  _content: string,
  setContent: (_content: string) => void
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

    const newValue = _content.substring(0, start) + formattedFormula + _content.substring(end);
    setContent(newValue);

    // 重新聚焦并设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formattedFormula.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  } else {
    setContent(_content + `$$${formula}$$`);
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
  if (!textarea) {
    return null;
  }

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
export const pasteFormat = (formatType: string, content: string, setContent: (_content: string) => void) => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) {
    return;
  }

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

export const generateTableOfContents = (content: string) => {
  // 从内容中提取标题，支持更复杂的标题格式
  const headingRegex = /^(#{1,6})\s+([^\n]+)$/gm;
  const headings: Array<{ level: number; text: string }> = [];
  let match;

  // 使用正则表达式匹配所有标题
  while ((match = headingRegex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      const level = match[1].length;
      let text = match[2].trim();

      // 清理标题文本，移除Markdown格式（粗体、斜体、链接等）
      text = text
        // 移除粗体 **text** 或 __text__
        .replace(/\*{2}([^*]+)\*{2}|_{2}([^_]+)_{2}/g, '$1$2')
        // 移除斜体 *text* 或 _text_
        .replace(/\*([^*]+)\*|_([^_]+)_/g, '$1$2')
        // 移除链接 [text](url)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // 移除行内代码 `text`
        .replace(/`([^`]+)`/g, '$1')
        // 移除脚注 [^text]
        .replace(/\[\^[^\]]+\]/g, '')
        // 移除HTML标签
        .replace(/<[^>]+>/g, '')
        // 移除特殊字符
        .replace(/[`*_{}[]()#+.!,-]/g, '')
        .trim();

      headings.push({ level, text });
    }
  }

  interface TableOfContentsItem {
    id: string;
    text: string;
    level: number;
    children: TableOfContentsItem[];
    // 添加额外的元数据
    'line': number;
    'wordCount': number;
  }

  const tocItems: TableOfContentsItem[] = [];
  const headingStack: TableOfContentsItem[] = [];

  headings.forEach((heading, index) => {
    const { level, text } = heading;
    // 生成更可靠的ID，避免重复
    const id = `heading-${index + 1}-${text.toLowerCase().replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')}`;

    const tocItem: TableOfContentsItem = {
      id,
      text,
      level,
      'children': [],
      'line': index + 1,
      'wordCount': text.split(/\s+/).length
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
  });

  return tocItems;
};
