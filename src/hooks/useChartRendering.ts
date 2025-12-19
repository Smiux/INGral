import { useEffect } from 'react';
import mermaid from 'mermaid';
import Chart from 'chart.js/auto';

/**
 * 图表渲染Hook，负责渲染Mermaid和Chart.js图表
 * @param contentRef 文章内容的DOM引用
 * @param article 文章数据，用于触发重新渲染
 */
export function useChartRendering<T extends { id: string }> (contentRef: React.RefObject<HTMLDivElement>, article: T | null) {
  useEffect(() => {
    // 配置Mermaid
    mermaid.initialize({
      'startOnLoad': false,
      'theme': 'default',
      'securityLevel': 'loose',
      'flowchart': {
        'useMaxWidth': true,
        'htmlLabels': true
      }
    });

    // 渲染Mermaid图表
    const renderMermaidDiagrams = async () => {
      const contentElement = contentRef.current;
      if (!contentElement) {
        return;
      }

      const mermaidElements = contentElement.querySelectorAll('.mermaid');
      if (mermaidElements.length > 0) {
        for (const element of mermaidElements) {
          try {
            const chartCode = (element as HTMLElement).textContent || '';
            const svgCode = await mermaid.render(element.id, chartCode);
            (element as HTMLElement).innerHTML = svgCode.svg;
          } catch (error) {
            console.error('Error rendering Mermaid diagram:', error);
            (element as HTMLElement).innerHTML = `<div class="text-red-500">Error rendering Mermaid diagram: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
          }
        }
      }
    };

    // 渲染Chart.js图表
    const renderChartJsCharts = () => {
      const contentElement = contentRef.current;
      if (!contentElement) {
        return;
      }

      const chartElements = contentElement.querySelectorAll('.chartjs-placeholder');
      if (chartElements.length > 0) {
        chartElements.forEach((element) => {
          try {
            const configStr = (element as HTMLCanvasElement).getAttribute('data-chart-config');
            if (configStr) {
              const config = JSON.parse(decodeURIComponent(configStr));
              const canvas = element as HTMLCanvasElement;
              new Chart(canvas, config);
            }
          } catch (error) {
            console.error('Error rendering Chart.js chart:', error);
            const canvas = element as HTMLCanvasElement;
            const container = canvas.parentElement;
            if (container) {
              container.innerHTML = `<div class="text-red-500">Error rendering Chart.js chart: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
            }
          }
        });
      }
    };

    // 当文章内容更新时，重新渲染图表
    const renderAllCharts = async () => {
      await renderMermaidDiagrams();
      renderChartJsCharts();
    };

    renderAllCharts();
  }, [contentRef, article]);
}
