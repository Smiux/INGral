/**
 * 导出工具类，提供导出相关的公共工具方法
 */
export class ExportUtils {
  /**
   * 触发文件下载
   * @param content 文件内容（字符串或Blob）
   * @param filename 文件名
   * @param mimeType MIME类型
   */
  static triggerDownload (content: string | Blob, filename: string, mimeType: string): void {
    try {
      // 创建Blob对象
      const blob = typeof content === 'string' ? new Blob([content], { 'type': mimeType }) : content;

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // 触发下载
      document.body.appendChild(link);
      link.click();

      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('文件下载失败:', error);
      throw new Error('文件下载失败');
    }
  }

  /**
   * 清理文件名，移除特殊字符
   * @param filename 原始文件名
   * @returns 清理后的文件名
   */
  static sanitizeFilename (filename: string): string {
    // 移除或替换非法字符
    return filename
      // 移除Windows文件名中的非法字符
      .replace(/[<>:/|?*"\\]/g, '_')
      // 合并多个空格
      .replace(/\s+/g, ' ')
      // 移除首尾空格
      .trim()
      // 限制长度
      .slice(0, 100);
  }

  /**
   * 转义XML特殊字符
   * @param text 原始文本
   * @returns 转义后的文本
   */
  static escapeXml (text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 转义CSV特殊字符
   * @param text 原始文本
   * @returns 转义后的文本
   */
  static escapeCsv (text: string): string {
    return text
      .replace(/"/g, '""')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ');
  }
}
