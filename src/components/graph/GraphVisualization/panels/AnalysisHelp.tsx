import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, BarChart3, Network, Route, GitMerge, Sparkles } from 'lucide-react';
import { PANEL_CONTAINER_CLASS, PANEL_HEADER_CLASS, PANEL_TITLE_CLASS, PANEL_CLOSE_BTN_CLASS, PANEL_CONTENT_CLASS } from './panelStyles';

interface HelpSection {
  title: string;
  icon: React.ReactNode;
  items: Array<{
    name: string;
    description: string;
    formula?: string;
  }>;
}

const HELP_SECTIONS: HelpSection[] = [
  {
    'title': '基本信息',
    'icon': <BarChart3 size={14} />,
    'items': [
      {
        'name': '节点数',
        'description': '图中节点的总数，衡量图规模的基本指标。节点数量越多，图的规模越大，包含的信息可能越丰富。'
      },
      {
        'name': '连接数',
        'description': '图中连接的总数，反映节点之间关系的数量。连接数越多，节点之间的连接越复杂。'
      },
      {
        'name': '平均度',
        'description': '所有节点度数的平均值，反映节点的平均连接程度。平均度高说明节点之间普遍连接紧密，信息传播效率可能较高。',
        'formula': '总连接数 × 2 / 节点数'
      },
      {
        'name': '密度',
        'description': '实际连接数与理论最大可能连接数的比值，反映图的连接紧密程度。密度值范围为 0 到 1，值越大表示节点之间的连接越紧密。',
        'formula': '实际连接数 / (节点数 × (节点数 - 1))'
      },
      {
        'name': '聚类系数',
        'description': '节点邻居之间实际连接数与理论最大可能连接数的比值，反映图中节点形成聚类的程度。聚类系数越高，说明节点之间越容易形成紧密的群组。',
        'formula': '邻居间实际连接数 / (邻居数 × (邻居数 - 1) / 2)'
      }
    ]
  },
  {
    'title': '连通性',
    'icon': <GitMerge size={14} />,
    'items': [
      {
        'name': '连通分量',
        'description': '图中一组相互连通的节点集合。弱连通分量忽略连接的方向，强连通分量要求沿连接方向可达。连通分量数为 1 表示整个图是连通的。'
      },
      {
        'name': '直径',
        'description': '图中任意两个可达节点之间最短路径的最大值，反映图的最大传播距离。直径越小，信息在图中的传播效率越高。对于有向图，此指标在弱连通意义下计算（忽略边方向）。'
      },
      {
        'name': '半径',
        'description': '所有节点离心率的最小值，即从某个"中心节点"出发到达最远节点的距离。半径对应的节点是图中最具可达性的节点。',
        'formula': 'min(所有节点的离心率)'
      },
      {
        'name': '离心率',
        'description': '从某节点到图中所有其他可达节点的最短路径的最大值。离心率越小，该节点越接近图的中心。对于有向图，此指标在弱连通意义下计算。',
        'formula': 'max(该节点到所有可达节点的最短路径长度)'
      },
      {
        'name': '平均最短路径长度',
        'description': '所有可达节点对之间最短路径长度的平均值，反映图中信息传播的平均效率。值越小表示节点之间的平均距离越近，是衡量网络小世界特性的重要指标。',
        'formula': '所有可达节点对的最短路径长度之和 / 可达节点对总数'
      }
    ]
  },
  {
    'title': '中心性',
    'icon': <Network size={14} />,
    'items': [
      {
        'name': '度中心性',
        'description': '最基本的中心性指标，衡量节点的连接数量。度数越高，节点在图中的直接影响力越大。在有向图中可分为入度和出度。',
        'formula': '节点的入度 + 出度'
      },
      {
        'name': '介数中心性',
        'description': '衡量节点出现在其他节点对之间最短路径上的频率。介数中心性高的节点是图中重要的信息传递枢纽，在信息传播中扮演桥梁角色。'
      },
      {
        'name': '连接介数中心性',
        'description': '衡量连接出现在节点对之间最短路径上的频率。连接介数中心性高的连接是图中重要的连接通道，删除这些连接会显著影响图的连通性。Girvan-Newman 社区检测算法即基于此指标。'
      },
      {
        'name': '接近中心性',
        'description': '衡量节点到所有其他节点的平均距离的倒数，反映节点的可达性和传播效率。接近中心性高的节点能够快速到达图中的其他节点。',
        'formula': '(节点数 - 1) / 该节点到所有其他节点的距离之和'
      },
      {
        'name': '特征向量中心性',
        'description': '基于网络结构的中心性指标，认为一个节点的重要性取决于其邻居的重要性。连接了很多重要节点的节点本身也会被认为是重要的。',
        'formula': '通过幂迭代法计算，节点得分与其邻居得分之和成正比'
      },
      {
        'name': 'PageRank',
        'description': 'Google 搜索引擎的核心算法，衡量节点的"权威性"。与特征向量中心性不同，PageRank 将节点的得分均匀分配给其邻居，而非简单求和，因此来自少量高权威节点的链接比大量低权威节点的链接更有价值。'
      },
      {
        'name': 'HITS 算法',
        'description': '为每个节点计算两个值：权威值（Authority）和枢纽值（Hub）。权威值衡量节点被多少高质量枢纽指向，枢纽值衡量节点指向了多少高质量权威。适用于分析有向图中的信息流向。'
      }
    ]
  },
  {
    'title': '路径分析',
    'icon': <Route size={14} />,
    'items': [
      {
        'name': '最短路径',
        'description': '两个节点之间连接数最少的路径，使用双向 BFS 算法计算。最短路径反映了节点之间的最短传播路径，是衡量信息传播效率的重要指标。'
      },
      {
        'name': '最长简单路径',
        'description': '两个节点之间不重复经过节点的最长路径。最长路径反映了节点之间的最长传播路径，有助于理解节点之间的间接关系和复杂交互。'
      },
      {
        'name': '全局最长路径',
        'description': '整个图中所有节点对之间的最长简单路径，反映图的最大传播距离和复杂度。'
      },
      {
        'name': '所有简单路径',
        'description': '两个节点之间所有不重复经过节点的路径。路径数量可以反映两节点之间连接的多样性和冗余程度。'
      },
      {
        'name': '单源最短路径',
        'description': '从指定源节点到所有其他节点的最短路径长度分布。可以直观了解源节点在图中的位置特征：可达范围、最远距离和平均距离。'
      }
    ]
  },
  {
    'title': '高级分析',
    'icon': <Sparkles size={14} />,
    'items': [
      {
        'name': '社区检测 (Louvain)',
        'description': '使用 Louvain 算法发现图中的社区结构。社区是图中连接紧密的节点子集，社区内节点之间的连接密度显著高于社区间。Louvain 算法通过贪心优化模块度来发现社区。'
      },
      {
        'name': '模块度',
        'description': '衡量社区划分质量的指标，取值范围通常为 -0.5 到 1。模块度越高，说明社区划分越好，社区内连接越紧密、社区间连接越稀疏。一般认为模块度大于 0.3 表示存在显著的社区结构。',
        'formula': 'Q = Σ[(社区内连接数/总连接数) - (社区内节点度数之和/总度数)²]'
      },
      {
        'name': 'DAG 检测与拓扑排序',
        'description': 'DAG（有向无环图）是不含环的有向图。拓扑排序是 DAG 中节点的一种线性排列，使得每条连接的起点都排在终点之前。拓扑层级则按依赖深度分组展示，层级 1 为入度为 0 的源节点。'
      },
      {
        'name': 'K-Core 核心分解',
        'description': 'K-Core 是图中每个节点度数至少为 K 的最大子图。通过逐步删除度数小于 K 的节点，可以得到不同层级的核心子图。K-Core 分解有助于识别图的核心结构和边缘节点。'
      }
    ]
  }
];

interface AnalysisHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const sectionColorMap: Record<string, string> = {
  '基本信息': 'text-sky-500',
  '连通性': 'text-cyan-500',
  '中心性': 'text-emerald-500',
  '路径分析': 'text-blue-500',
  '高级分析': 'text-teal-500'
};

const formulaColorMap: Record<string, string> = {
  '基本信息': 'text-sky-600',
  '连通性': 'text-cyan-600',
  '中心性': 'text-emerald-600',
  '路径分析': 'text-blue-600',
  '高级分析': 'text-teal-600'
};

export const AnalysisHelp: React.FC<AnalysisHelpProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-50 flex"
          initial={{ 'opacity': 0 }}
          animate={{ 'opacity': 1 }}
          exit={{ 'opacity': 0 }}
          transition={{ 'duration': 0.15 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={`relative ${PANEL_CONTAINER_CLASS} w-full h-full`}
            initial={{ 'x': '100%' }}
            animate={{ 'x': 0 }}
            exit={{ 'x': '100%' }}
            transition={{ 'type': 'spring', 'damping': 25, 'stiffness': 300 }}
          >
            <header className={PANEL_HEADER_CLASS}>
              <div className={`${PANEL_TITLE_CLASS} gap-2`}>
                <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                分析帮助
              </div>
              <button onClick={onClose} className={PANEL_CLOSE_BTN_CLASS}>
                <X size={16} />
              </button>
            </header>

            <div className={`${PANEL_CONTENT_CLASS} space-y-5`}>
              {HELP_SECTIONS.map((section) => (
                <section key={section.title}>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-1.5 ${sectionColorMap[section.title] ?? 'text-slate-600'}`}>
                    {section.icon}
                    {section.title}
                  </h4>
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <div key={item.name} className="pl-2">
                        <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{item.name}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
                        {item.formula && (
                          <p className={`text-xs font-medium mt-1 ${formulaColorMap[section.title] ?? 'text-blue-600'}`}>
                            {item.formula}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
