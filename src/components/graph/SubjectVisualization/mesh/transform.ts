import type { SubjectNode, GraphData, NodeExtraInfo, SubjectUIConfig } from '../types';
import { registerSubject } from '../register';
import { getCachedData, loadData } from '../dataLoader';

const idToNameMap = new Map<string, string>();

const buildIdToNameMap = () => {
  const cachedData = getCachedData('mesh');
  if (cachedData && cachedData.idToNameMap) {
    Object.entries(cachedData.idToNameMap).forEach(([key, value]) => {
      idToNameMap.set(key, value);
    });
  }
};

export const getIdName = (id: string): string => {
  if (idToNameMap.size === 0) {
    buildIdToNameMap();
  }
  return idToNameMap.get(id) || id;
};

const transformData = (): GraphData => {
  const cachedData = getCachedData('mesh');
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
  'key': 'mesh',
  'name': 'MeSH',
  'rootName': 'MeSH',
  'description': 'Medical Subject Headings 2026'
});

const getUIConfig = (): SubjectUIConfig => ({
  'showCodeField': true,
  'codeFieldLabel': '分类',
  'tooltipFields': [
    { 'key': 'title', 'label': '名称', 'type': 'text' }
  ],
  'panelFields': [
    { 'key': 'code', 'label': '分类', 'type': 'code', 'icon': 'Hash' },
    { 'key': 'title', 'label': '分类名称', 'type': 'text', 'icon': 'FileText' },
    { 'key': 'level', 'label': '层级', 'type': 'badge', 'icon': 'ChevronDown' },
    { 'key': 'allLevels', 'label': '所有层级', 'type': 'list', 'icon': 'Layers' },
    { 'key': 'treeNumbers', 'label': '树编号', 'type': 'list', 'icon': 'Layers' },
    { 'key': 'scopeNote', 'label': '范围说明', 'type': 'text', 'icon': 'FileText' },
    { 'key': 'seeRelated', 'label': '相关概念', 'type': 'list', 'icon': 'Link2' },
    { 'key': 'allowableQualifiers', 'label': '允许的限定词', 'type': 'list', 'icon': 'GitBranch' },
    { 'key': 'pharmacologicalActions', 'label': '药理作用', 'type': 'list', 'icon': 'Folder' }
  ],
  'levelLabels': {}
});

const getLevelLabel = (level: string): string => {
  if (level === 'root') {
    return '根节点';
  }
  const match = level.match(/level_(\d+)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return `${num}级节点`;
  }
  return level;
};

const getNodeExtraInfo = (node: SubjectNode): NodeExtraInfo | null => {
  const data = node.originalData;
  const extra: NodeExtraInfo = {};

  if (data.allLevels && Array.isArray(data.allLevels)) {
    extra.allLevels = (data.allLevels as string[]).map((l) => getLevelLabel(l));
  }
  if (data.treeNumbers && Array.isArray(data.treeNumbers)) {
    extra.treeNumbers = data.treeNumbers as string[];
  }
  if (data.scopeNote && typeof data.scopeNote === 'string') {
    extra.scopeNote = data.scopeNote;
  }
  if (data.seeRelated && Array.isArray(data.seeRelated)) {
    extra.seeRelated = (data.seeRelated as Array<{ ui: string; name: string }>).map((item) => item.name);
  }
  if (data.allowableQualifiers && Array.isArray(data.allowableQualifiers)) {
    extra.allowableQualifiers = (data.allowableQualifiers as Array<{ ui: string; name: string; abbreviation: string }>).map((item) => `${item.abbreviation}: ${item.name}`);
  }
  if (data.pharmacologicalActions && Array.isArray(data.pharmacologicalActions)) {
    extra.pharmacologicalActions = (data.pharmacologicalActions as Array<{ ui: string; name: string }>).map((item) => item.name);
  }

  return Object.keys(extra).length > 0 ? extra : null;
};

registerSubject('mesh', {
  transformData,
  getSubjectInfo,
  getUIConfig,
  getNodeExtraInfo,
  getIdName,
  'loadData': async () => {
    await loadData('mesh');
  }
});
