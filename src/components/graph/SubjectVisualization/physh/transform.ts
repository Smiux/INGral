import type { SubjectNode, GraphData, NodeExtraInfo, SubjectUIConfig } from '../types';
import { registerSubject } from '../register';
import { getCachedData, loadData } from '../dataLoader';

const idToNameMap = new Map<string, string>();

const buildIdToNameMap = () => {
  const cachedData = getCachedData('physh');
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
  return idToNameMap.get(id) || id.split('/').pop() || id;
};

const transformData = (): GraphData => {
  const cachedData = getCachedData('physh');
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
  'key': 'physh',
  'name': 'PhySH',
  'rootName': 'PhySH',
  'description': 'Physics Subject Headings'
});

const getUIConfig = (): SubjectUIConfig => ({
  'showCodeField': false,
  'codeFieldLabel': '分类',
  'tooltipFields': [
    { 'key': 'title', 'label': '名称', 'type': 'text' }
  ],
  'panelFields': [
    { 'key': 'title', 'label': '概念名称', 'type': 'text', 'icon': 'FileText' },
    { 'key': 'level', 'label': '层级', 'type': 'badge', 'icon': 'ChevronDown' },
    { 'key': 'parentNodes', 'label': '父节点', 'type': 'list', 'icon': 'GitBranch' },
    { 'key': 'childNodes', 'label': '子节点', 'type': 'list', 'icon': 'Layers' },
    { 'key': 'related', 'label': '相关概念 (Related)', 'type': 'list', 'icon': 'Link2' },
    { 'key': 'inFacet', 'label': '所属板块', 'type': 'list', 'icon': 'Folder' },
    { 'key': 'scopeNote', 'label': '范围说明', 'type': 'text', 'icon': 'FileText' }
  ],
  'levelLabels': {}
});

const getNodeExtraInfo = (node: SubjectNode): NodeExtraInfo | null => {
  const data = node.originalData;
  const extra: NodeExtraInfo = {};

  if (data.broader && Array.isArray(data.broader)) {
    extra.broader = data.broader as string[];
  }
  if (data.narrower && Array.isArray(data.narrower)) {
    extra.narrower = data.narrower as string[];
  }
  if (data.related && Array.isArray(data.related)) {
    extra.related = data.related as string[];
  }
  if (data.inFacet && Array.isArray(data.inFacet)) {
    extra.inFacet = data.inFacet as string[];
  }
  if (data.inDiscipline && Array.isArray(data.inDiscipline)) {
    extra.inDiscipline = data.inDiscipline as string[];
  }
  if (data.usedByDiscipline && Array.isArray(data.usedByDiscipline)) {
    extra.usedByDiscipline = data.usedByDiscipline as string[];
  }
  if (data.scopeNote && typeof data.scopeNote === 'string') {
    extra.scopeNote = data.scopeNote;
  }

  return Object.keys(extra).length > 0 ? extra : null;
};

registerSubject('physh', {
  transformData,
  getSubjectInfo,
  getUIConfig,
  getNodeExtraInfo,
  getIdName,
  'loadData': async () => {
    await loadData('physh');
  }
});
