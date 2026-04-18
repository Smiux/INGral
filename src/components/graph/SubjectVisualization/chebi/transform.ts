import type { SubjectNode, GraphData, NodeExtraInfo, SubjectUIConfig } from '../types';
import { registerSubject } from '../register';
import { getCachedData, loadData } from '../dataLoader';

const idToNameMap = new Map<string, string>();

const buildIdToNameMap = () => {
  const cachedData = getCachedData('chebi');
  if (cachedData && cachedData.idToNameMap) {
    const entries = Object.entries(cachedData.idToNameMap);
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry) {
        const [key, value] = entry;
        idToNameMap.set(key, value);
      }
    }
  }
};

export const getIdName = (id: string): string => {
  if (idToNameMap.size === 0) {
    buildIdToNameMap();
  }
  return idToNameMap.get(id) || id;
};

const transformData = (): GraphData => {
  const cachedData = getCachedData('chebi');
  if (!cachedData) {
    return { 'nodes': [], 'links': [] };
  }
  buildIdToNameMap();
  return {
    'nodes': cachedData.nodes,
    'links': cachedData.links
  };
};

const getSubjectInfo = () => ({
  'key': 'chebi',
  'name': 'ChEBI',
  'rootName': 'ChEBI',
  'description': 'Chemical Entities of Biological Interest'
});

const getUIConfig = (): SubjectUIConfig => ({
  'showCodeField': true,
  'codeFieldLabel': 'CHEBI ID',
  'tooltipFields': [
    { 'key': 'title', 'label': '名称', 'type': 'text' }
  ],
  'panelFields': [
    { 'key': 'code', 'label': 'CHEBI ID', 'type': 'code', 'icon': 'Hash' },
    { 'key': 'title', 'label': '名称', 'type': 'text', 'icon': 'FileText' },
    { 'key': 'definition', 'label': '定义', 'type': 'text', 'icon': 'Info' },
    { 'key': 'starRating', 'label': '数据质量', 'type': 'badge', 'icon': 'Star' },
    { 'key': 'level', 'label': '层级', 'type': 'badge', 'icon': 'ChevronDown' },
    { 'key': 'parentNodes', 'label': '父节点', 'type': 'list', 'icon': 'GitBranch' },
    { 'key': 'childNodes', 'label': '子节点', 'type': 'list', 'icon': 'Layers' },
    { 'key': 'synonyms', 'label': '同义词', 'type': 'list', 'icon': 'List' }
  ],
  'levelLabels': {}
});

const getNodeExtraInfo = (node: SubjectNode): NodeExtraInfo | null => {
  const data = node.originalData;
  const extra: NodeExtraInfo = {};

  if (data.definition && typeof data.definition === 'string') {
    extra.definition = data.definition;
  }

  if (data.starRating !== undefined) {
    const rating = data.starRating as number;
    if (rating === 3) {
      extra.starRating = '3星 (已审核)';
    } else if (rating === 2) {
      extra.starRating = '2星 (自动导入)';
    } else {
      extra.starRating = '1星';
    }
  }

  if (data.synonyms && Array.isArray(data.synonyms) && data.synonyms.length > 0) {
    extra.synonyms = data.synonyms as string[];
  }

  return Object.keys(extra).length > 0 ? extra : null;
};

registerSubject('chebi', {
  transformData,
  getSubjectInfo,
  getUIConfig,
  getNodeExtraInfo,
  getIdName,
  'loadData': async () => {
    await loadData('chebi');
  }
});
