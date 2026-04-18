export const generateRandomColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 75%, 45%)`;
};

export const parseHSL = (hsl: string): { 'h': number; 's': number; 'l': number } => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match && match[1] && match[2] && match[3]) {
    return {
      'h': parseInt(match[1], 10),
      's': parseInt(match[2], 10),
      'l': parseInt(match[3], 10)
    };
  }
  return { 'h': 0, 's': 75, 'l': 45 };
};

export const generateChildColor = (parentHSL: string, hueOffset: number): string => {
  const { h, s, l } = parseHSL(parentHSL);
  const newHue = (h + hueOffset) % 360;
  const newSat = Math.min(100, s + 10);
  const newLight = Math.min(70, l + 15);
  return `hsl(${newHue}, ${newSat}%, ${newLight}%)`;
};

export const getNodeLevelLabel = (level: string): string => {
  const labels: Record<string, string> = {
    'root': '根节点',
    'main': '一级分类',
    'subgroup': '二级分类',
    'item': '三级分类',
    'special': '特殊分类',
    'discipline': '学科',
    'concept': '概念'
  };
  return labels[level] || level;
};
