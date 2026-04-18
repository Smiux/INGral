import type { SubjectNode, GraphData, NodeExtraInfo, SubjectUIConfig } from '../types';
import { registerSubject } from '../register';
import { getCachedData, loadData } from '../dataLoader';

const idToNameMap = new Map<string, string>();

const DIVISION_NAMES: Record<string, string> = {
  '0': 'Bacteria',
  '1': 'Invertebrates',
  '2': 'Mammals',
  '3': 'Phages',
  '4': 'Plants and Fungi',
  '5': 'Primates',
  '6': 'Rodents',
  '7': 'Synthetic and Chimeric',
  '8': 'Unassigned',
  '9': 'Viruses',
  '10': 'Vertebrates',
  '11': 'Environmental samples'
};

const RANK_NAMES: Record<string, string> = {
  'domain': '域',
  'superkingdom': '超界',
  'kingdom': '界',
  'phylum': '门',
  'class': '纲',
  'order': '目',
  'family': '科',
  'genus': '属',
  'species': '种'
};

const buildIdToNameMap = () => {
  const cachedData = getCachedData('ncbi');
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
  const cachedData = getCachedData('ncbi');
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
  'key': 'ncbi',
  'name': 'NCBI Taxonomy',
  'rootName': 'NCBI Taxonomy',
  'description': 'NCBI 生物分类数据库'
});

const getUIConfig = (): SubjectUIConfig => ({
  'showCodeField': true,
  'codeFieldLabel': 'Taxonomy ID',
  'tooltipFields': [
    { 'key': 'title', 'label': '名称', 'type': 'text' }
  ],
  'panelFields': [
    { 'key': 'code', 'label': 'Taxonomy ID', 'type': 'code', 'icon': 'Hash' },
    { 'key': 'title', 'label': '学名', 'type': 'text', 'icon': 'FileText' },
    { 'key': 'commonName', 'label': '通用名', 'type': 'text', 'icon': 'Info' },
    { 'key': 'rank', 'label': '层级', 'type': 'badge', 'icon': 'Layers' },
    { 'key': 'division', 'label': '大类', 'type': 'badge', 'icon': 'Folder' },
    { 'key': 'level', 'label': '层级', 'type': 'badge', 'icon': 'ChevronDown' },
    { 'key': 'parentNodes', 'label': '父节点', 'type': 'list', 'icon': 'GitBranch' },
    { 'key': 'childNodes', 'label': '子节点', 'type': 'list', 'icon': 'Layers' },
    { 'key': 'comments', 'label': '注释', 'type': 'text', 'icon': 'MessageSquare' },
    { 'key': 'synonyms', 'label': '同义词', 'type': 'list', 'icon': 'List' }
  ],
  'levelLabels': {}
});

const getNodeExtraInfo = (node: SubjectNode): NodeExtraInfo | null => {
  const data = node.originalData;
  const extra: NodeExtraInfo = {};

  if (data.commonName && typeof data.commonName === 'string') {
    extra.commonName = data.commonName;
  }

  if (data.rank && typeof data.rank === 'string') {
    extra.rank = RANK_NAMES[data.rank] || data.rank;
  }

  if (data.divisionId && typeof data.divisionId === 'string') {
    extra.division = DIVISION_NAMES[data.divisionId] || `大类 ${data.divisionId}`;
  }

  if (data.comments && typeof data.comments === 'string' && data.comments.length > 0) {
    extra.comments = data.comments;
  }

  if (data.synonyms && Array.isArray(data.synonyms) && data.synonyms.length > 0) {
    extra.synonyms = data.synonyms as string[];
  }

  return Object.keys(extra).length > 0 ? extra : null;
};

registerSubject('ncbi', {
  transformData,
  getSubjectInfo,
  getUIConfig,
  getNodeExtraInfo,
  getIdName,
  'loadData': async () => {
    await loadData('ncbi');
  }
});
