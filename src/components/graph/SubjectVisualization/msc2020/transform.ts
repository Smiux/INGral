import type { GraphData, NodeExtraInfo, SubjectUIConfig } from '../types';
import { registerSubject } from '../register';
import { getCachedData, loadData } from '../dataLoader';

const transformData = (): GraphData => {
  const cachedData = getCachedData('msc2020');
  if (!cachedData) {
    return { 'nodes': [], 'links': [] };
  }
  return {
    'nodes': cachedData.nodes,
    'links': cachedData.links
  };
};

const getSubjectInfo = () => ({
  'key': 'msc2020',
  'name': 'MSC2020',
  'rootName': 'MSC2020',
  'description': 'Mathematics Subject Classification 2020'
});

const getUIConfig = (): SubjectUIConfig => ({
  'showCodeField': true,
  'codeFieldLabel': '分类代码',
  'tooltipFields': [
    { 'key': 'code', 'label': '代码', 'type': 'code' },
    { 'key': 'title', 'label': '名称', 'type': 'text' }
  ],
  'panelFields': [
    { 'key': 'code', 'label': '分类代码', 'type': 'code', 'icon': 'Hash' },
    { 'key': 'title', 'label': '分类名称', 'type': 'text', 'icon': 'FileText' },
    { 'key': 'level', 'label': '分类级别', 'type': 'badge', 'icon': 'ChevronDown' },
    { 'key': 'parentNodes', 'label': '父节点', 'type': 'list', 'icon': 'GitBranch' },
    { 'key': 'childNodes', 'label': '子节点', 'type': 'list', 'icon': 'Layers' }
  ],
  'levelLabels': {
    'root': '根节点',
    'main': '一级分类',
    'subgroup': '二级分类',
    'item': '三级分类',
    'special': '特殊分类'
  }
});

const getNodeExtraInfo = (): NodeExtraInfo | null => {
  return null;
};

registerSubject('msc2020', {
  transformData,
  getSubjectInfo,
  getUIConfig,
  getNodeExtraInfo,
  'loadData': async () => {
    await loadData('msc2020');
  }
});
