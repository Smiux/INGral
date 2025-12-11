import type { Graph, GraphNode, GraphLink } from '../../types';
import { ExportUtils } from './ExportUtils';

/**
 * 知识图谱导出服务类，提供知识图谱导出功能
 */
export class GraphExportService {
  /**
   * 导出知识图谱为JSON格式
   * @param graph 图谱数据
   * @returns JSON格式的图谱数据
   */
  async exportGraphToJson(graph: Graph): Promise<string> {
    try {
      return JSON.stringify(graph, null, 2);
    } catch (error) {
      console.error('导出图谱JSON失败:', error);
      throw new Error('导出图谱JSON失败');
    }
  }

  /**
   * 导出知识图谱为GraphML格式
   * @param graph 图谱数据
   * @returns GraphML格式的图谱数据
   */
  async exportGraphToGraphml(graph: Graph): Promise<string> {
    try {
      // 创建GraphML文件头部
      let graphmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns 
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="d0" for="node" attr.name="title" attr.type="string"/>
  <key id="d1" for="node" attr.name="connections" attr.type="int"/>
  <key id="d2" for="node" attr.name="type" attr.type="string"/>
  <key id="d3" for="node" attr.name="description" attr.type="string"/>
  <key id="d4" for="edge" attr.name="type" attr.type="string"/>
  <key id="d5" for="edge" attr.name="label" attr.type="string"/>
  <key id="d6" for="edge" attr.name="weight" attr.type="double"/>
  <graph id="G" edgedefault="undirected">`;

      // 添加节点
      graph.nodes.forEach((node: GraphNode) => {
        graphmlContent += `
    <node id="${node.id}">
      <data key="d0">${ExportUtils.escapeXml(node.title)}</data>
      <data key="d1">${node.connections}</data>`;

        if (node.type) {
          graphmlContent += `
      <data key="d2">${node.type}</data>`;
        }

        if (node.description) {
          graphmlContent += `
      <data key="d3">${ExportUtils.escapeXml(node.description)}</data>`;
        }

        graphmlContent += `
    </node>`;
      });

      // 添加链接
      graph.links.forEach((link: GraphLink) => {
        graphmlContent += `
    <edge source="${link.source}" target="${link.target}">
      <data key="d4">${link.type}</data>`;

        if (link.label) {
          graphmlContent += `
      <data key="d5">${ExportUtils.escapeXml(link.label)}</data>`;
        }

        if (link.weight) {
          graphmlContent += `
      <data key="d6">${link.weight}</data>`;
        }

        graphmlContent += `
    </edge>`;
      });

      // 关闭GraphML文件
      graphmlContent += `
  </graph>
</graphml>`;

      return graphmlContent;
    } catch (error) {
      console.error('导出图谱GraphML失败:', error);
      throw new Error('导出图谱GraphML失败');
    }
  }

  /**
   * 导出知识图谱为CSV格式（节点和链接两个文件）
   * @param graph 图谱数据
   * @returns 包含节点和链接CSV数据的对象
   */
  async exportGraphToCsv(graph: Graph): Promise<{ nodesCsv: string; linksCsv: string }> {
    try {
      // 节点CSV
      let nodesCsv = 'id,title,connections,type,description\n';
      graph.nodes.forEach((node: GraphNode) => {
        nodesCsv += `${node.id},"${ExportUtils.escapeCsv(node.title)}",${node.connections},${node.type || ''},"${ExportUtils.escapeCsv(node.description || '')}"\n`;
      });

      // 链接CSV
      let linksCsv = 'source,target,type,label,weight\n';
      graph.links.forEach((link: GraphLink) => {
        linksCsv += `${link.source},${link.target},${link.type},"${ExportUtils.escapeCsv(link.label || '')}",${link.weight || ''}\n`;
      });

      return { nodesCsv, linksCsv };
    } catch (error) {
      console.error('导出图谱CSV失败:', error);
      throw new Error('导出图谱CSV失败');
    }
  }

  /**
   * 导出图谱为JSON文件
   * @param graph 图谱数据
   */
  async exportGraphAsJsonFile(graph: Graph): Promise<void> {
    try {
      const jsonContent = await this.exportGraphToJson(graph);
      const safeFilename = ExportUtils.sanitizeFilename(graph.title || 'knowledge-graph') + '.json';
      ExportUtils.triggerDownload(jsonContent, safeFilename, 'application/json;charset=utf-8');
    } catch (error) {
      console.error('导出图谱JSON文件失败:', error);
      throw new Error('导出图谱JSON文件失败');
    }
  }

  /**
   * 导出图谱为GraphML文件
   * @param graph 图谱数据
   */
  async exportGraphAsGraphmlFile(graph: Graph): Promise<void> {
    try {
      const graphmlContent = await this.exportGraphToGraphml(graph);
      const safeFilename = ExportUtils.sanitizeFilename(graph.title || 'knowledge-graph') + '.graphml';
      ExportUtils.triggerDownload(graphmlContent, safeFilename, 'application/xml;charset=utf-8');
    } catch (error) {
      console.error('导出图谱GraphML文件失败:', error);
      throw new Error('导出图谱GraphML文件失败');
    }
  }

  /**
   * 导出图谱为CSV文件（生成zip包）
   * @param graph 图谱数据
   */
  async exportGraphAsCsvFiles(graph: Graph): Promise<void> {
    try {
      const { nodesCsv, linksCsv } = await this.exportGraphToCsv(graph);
      const safeFilename = ExportUtils.sanitizeFilename(graph.title || 'knowledge-graph');

      // 检查浏览器是否支持CompressionStream API
      if (typeof CompressionStream !== 'undefined') {
        // 使用CompressionStream生成zip文件
        const zipContent = await this.generateZipFile({
          [`${safeFilename}_nodes.csv`]: nodesCsv,
          [`${safeFilename}_links.csv`]: linksCsv,
        });

        ExportUtils.triggerDownload(zipContent, `${safeFilename}_csv.zip`, 'application/zip');
      } else {
        // 不支持zip生成，分别下载两个文件
        ExportUtils.triggerDownload(nodesCsv, `${safeFilename}_nodes.csv`, 'text/csv;charset=utf-8');
        ExportUtils.triggerDownload(linksCsv, `${safeFilename}_links.csv`, 'text/csv;charset=utf-8');
      }
    } catch (error) {
      console.error('导出图谱CSV文件失败:', error);
      throw new Error('导出图谱CSV文件失败');
    }
  }

  /**
   * 将SVG元素转换为Canvas
   * @param svgElement SVG元素
   * @returns Canvas元素
   */
  private async svgToCanvas(svgElement: SVGSVGElement): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      try {
        // 克隆SVG元素，避免修改原始元素
        const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
        
        // 设置SVG的XML命名空间
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        // 获取SVG的尺寸
        const width = svgElement.clientWidth;
        const height = svgElement.clientHeight;
        
        // 设置SVG的尺寸属性
        svgClone.setAttribute('width', width.toString());
        svgClone.setAttribute('height', height.toString());
        svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        // 转换SVG为XML字符串
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgClone);
        
        // 创建Data URL
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        
        // 创建Image元素
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // 创建Canvas元素
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // 绘制Image到Canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法获取Canvas上下文'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas);
        };
        
        img.onerror = () => {
          reject(new Error('无法加载SVG图像'));
        };
        
        // 设置Image的src
        img.src = svgDataUrl;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 导出图谱为PNG图片
   * @param svgSelector 图谱SVG的选择器
   * @param filename 文件名
   */
  async exportGraphAsPng(svgSelector: string, filename: string): Promise<void> {
    try {
      // 获取SVG元素
      const svgElement = document.querySelector<SVGSVGElement>(svgSelector);
      if (!svgElement) {
        throw new Error('找不到图谱SVG元素');
      }
      
      // 转换SVG为Canvas
      const canvas = await this.svgToCanvas(svgElement);

      // 转换为PNG并下载
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('无法生成PNG文件');
        }
        ExportUtils.triggerDownload(blob, filename, 'image/png');
      });
    } catch (error) {
      console.error('导出图谱PNG失败:', error);
      throw new Error('导出图谱PNG失败');
    }
  }

  /**
   * 导出图谱为PDF
   * @param svgSelector 图谱SVG的选择器
   * @param graph 图谱数据
   */
  async exportGraphAsPdf(svgSelector: string, graph: Graph): Promise<void> {
    try {
      // 获取SVG元素
      const svgElement = document.querySelector<SVGSVGElement>(svgSelector);
      if (!svgElement) {
        throw new Error('找不到图谱SVG元素');
      }
      
      // 转换SVG为Canvas
      const canvas = await this.svgToCanvas(svgElement);
      
      // 将Canvas转换为图片URL
      const imgData = canvas.toDataURL('image/png');
      
      // 创建PDF内容
      const pdfContent = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${graph.title || '知识图谱'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 20px;
              color: #333;
            }
            .graph-container {
              margin: 0 auto;
              max-width: 100%;
            }
            img {
              max-width: 100%;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .metadata {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <h1>${graph.title || '知识图谱'}</h1>
          <div class="graph-container">
            <img src="${imgData}" alt="知识图谱">
          </div>
          <div class="metadata">
            <p>节点数量: ${graph.nodes.length}</p>
            <p>链接数量: ${graph.links.length}</p>
            <p>创建时间: ${new Date(graph.created_at || Date.now()).toLocaleString()}</p>
            <p>更新时间: ${new Date(graph.updated_at || Date.now()).toLocaleString()}</p>
          </div>
          <div class="footer">
            本文导出自知识库系统 · ${new Date().toLocaleDateString()}
          </div>
        </body>
        </html>
      `;

      // 创建一个新窗口
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('无法打开打印窗口，请检查浏览器设置');
      }

      // 写入内容到新窗口
      printWindow.document.write(pdfContent);
      printWindow.document.close();

      // 等待内容加载完成后触发打印
      printWindow.onload = () => {
        if (printWindow.matchMedia) {
          printWindow.matchMedia('print').addListener((mql) => {
            if (!mql.matches) {
              // 打印对话框关闭后关闭窗口
              setTimeout(() => printWindow.close(), 100);
            }
          });
        }

        // 触发打印
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      };
    } catch (error) {
      console.error('导出图谱PDF失败:', error);
      throw new Error('导出图谱PDF失败');
    }
  }

  /**
   * 生成Zip文件（使用CompressionStream API）
   * @param files 文件对象映射
   * @returns Zip文件内容
   */
  private async generateZipFile(files: Record<string, string>): Promise<Blob> {
    const stream = new ReadableStream({
      async start(controller) {
        // 简单的Zip文件生成（仅支持文本文件）
        // 注意：这是一个简化实现，不支持完整的Zip规范
        let offset = 0;
        const centralDirectory: string[] = [];

        for (const [filename, content] of Object.entries(files)) {
          // 文件头
          const fileHeader = new Uint8Array(30);
          fileHeader.set(new TextEncoder().encode('PK\x03\x04'), 0); // 签名
          fileHeader[4] = 0x14;
          fileHeader[5] = 0x00; // 版本
          fileHeader[6] = 0x00;
          fileHeader[7] = 0x00; // 标志
          fileHeader[8] = 0x00;
          fileHeader[9] = 0x00; // 压缩方法（存储）
          fileHeader[10] = 0x00;
          fileHeader[11] = 0x00; // 修改时间
          fileHeader[12] = 0x00;
          fileHeader[13] = 0x00; // 修改日期
          fileHeader[14] = 0x00;
          fileHeader[15] = 0x00; // CRC32
          fileHeader[16] = 0x00;
          fileHeader[17] = 0x00;
          fileHeader[18] = 0x00;
          fileHeader[19] = 0x00; // 压缩大小
          fileHeader[20] = 0x00;
          fileHeader[21] = 0x00;
          fileHeader[22] = 0x00;
          fileHeader[23] = 0x00; // 未压缩大小
          fileHeader[24] = filename.length & 0xFF;
          fileHeader[25] = (filename.length >> 8) & 0xFF; // 文件名长度
          fileHeader[26] = 0x00;
          fileHeader[27] = 0x00; // 额外字段长度

          controller.enqueue(fileHeader);
          offset += fileHeader.length;

          // 文件名
          const filenameBytes = new TextEncoder().encode(filename);
          controller.enqueue(filenameBytes);
          offset += filenameBytes.length;

          // 文件内容
          const contentBytes = new TextEncoder().encode(content);
          controller.enqueue(contentBytes);
          offset += contentBytes.length;

          // 记录到中央目录
          const centralDirRecord = new Uint8Array(46);
          centralDirRecord.set(new TextEncoder().encode('PK\x01\x02'), 0); // 签名
          centralDirRecord[4] = 0x14;
          centralDirRecord[5] = 0x00; // 版本
          centralDirRecord[6] = 0x14;
          centralDirRecord[7] = 0x00; // 版本所需
          centralDirRecord[8] = 0x00;
          centralDirRecord[9] = 0x00; // 标志
          centralDirRecord[10] = 0x00;
          centralDirRecord[11] = 0x00; // 压缩方法
          centralDirRecord[12] = 0x00;
          centralDirRecord[13] = 0x00; // 修改时间
          centralDirRecord[14] = 0x00;
          centralDirRecord[15] = 0x00; // 修改日期
          centralDirRecord[16] = 0x00;
          centralDirRecord[17] = 0x00;
          centralDirRecord[18] = 0x00;
          centralDirRecord[19] = 0x00; // CRC32
          centralDirRecord[20] = 0x00;
          centralDirRecord[21] = 0x00;
          centralDirRecord[22] = 0x00;
          centralDirRecord[23] = 0x00; // 压缩大小
          centralDirRecord[24] = 0x00;
          centralDirRecord[25] = 0x00;
          centralDirRecord[26] = 0x00;
          centralDirRecord[27] = 0x00; // 未压缩大小
          centralDirRecord[28] = filename.length & 0xFF;
          centralDirRecord[29] = (filename.length >> 8) & 0xFF; // 文件名长度
          centralDirRecord[30] = 0x00;
          centralDirRecord[31] = 0x00; // 额外字段长度
          centralDirRecord[32] = 0x00;
          centralDirRecord[33] = 0x00; // 文件注释长度
          centralDirRecord[34] = 0x00;
          centralDirRecord[35] = 0x00; // 磁盘号
          centralDirRecord[36] = 0x00;
          centralDirRecord[37] = 0x00; // 内部文件属性
          centralDirRecord[38] = 0x00;
          centralDirRecord[39] = 0x00;
          centralDirRecord[40] = 0x00;
          centralDirRecord[41] = 0x00; // 外部文件属性
          const fileOffset = offset - fileHeader.length - filenameBytes.length;
          centralDirRecord[42] = fileOffset & 0xFF;
          centralDirRecord[43] = (fileOffset >> 8) & 0xFF;
          centralDirRecord[44] = (fileOffset >> 16) & 0xFF;
          centralDirRecord[45] = (fileOffset >> 24) & 0xFF; // 本地文件头偏移

          centralDirectory.push(Array.from(centralDirRecord).map(b => String.fromCharCode(b)).join(''));
          centralDirectory.push(filename);
        }

        // 中央目录
        const centralDirectoryContent = centralDirectory.join('');
        const centralDirectoryBytes = new TextEncoder().encode(centralDirectoryContent);
        controller.enqueue(centralDirectoryBytes);

        // 中央目录结束
        const endOfCentralDirectory = new Uint8Array(22);
        endOfCentralDirectory.set(new TextEncoder().encode('PK\x05\x06'), 0); // 签名
        endOfCentralDirectory[4] = 0x00;
        endOfCentralDirectory[5] = 0x00; // 磁盘号
        endOfCentralDirectory[6] = 0x00;
        endOfCentralDirectory[7] = 0x00; // 中央目录开始磁盘
        const fileCount = Object.keys(files).length;
        endOfCentralDirectory[8] = fileCount & 0xFF;
        endOfCentralDirectory[9] = (fileCount >> 8) & 0xFF; // 本磁盘文件数
        endOfCentralDirectory[10] = fileCount & 0xFF;
        endOfCentralDirectory[11] = (fileCount >> 8) & 0xFF; // 总文件数
        endOfCentralDirectory[12] = centralDirectoryBytes.length & 0xFF;
        endOfCentralDirectory[13] = (centralDirectoryBytes.length >> 8) & 0xFF;
        endOfCentralDirectory[14] = (centralDirectoryBytes.length >> 16) & 0xFF;
        endOfCentralDirectory[15] = (centralDirectoryBytes.length >> 24) & 0xFF; // 中央目录大小
        endOfCentralDirectory[16] = offset & 0xFF;
        endOfCentralDirectory[17] = (offset >> 8) & 0xFF;
        endOfCentralDirectory[18] = (offset >> 16) & 0xFF;
        endOfCentralDirectory[19] = (offset >> 24) & 0xFF; // 中央目录偏移
        endOfCentralDirectory[20] = 0x00;
        endOfCentralDirectory[21] = 0x00; // 注释长度

        controller.enqueue(endOfCentralDirectory);
        controller.close();
      },
    });

    return new Response(stream).blob();
  }
}
