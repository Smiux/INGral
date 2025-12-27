import type { GraphNode, GraphConnection } from './GraphTypes';

export class GraphUtils {
  static generateId (prefix: string = 'id'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36)
      .substr(2, 9)}`;
  }

  static generateNodeId (): string {
    return `node-${Date.now()}-${Math.random().toString(36)
      .substr(2, 9)}`;
  }

  static generateLinkId (): string {
    return `link-${Date.now()}-${Math.random().toString(36)
      .substr(2, 9)}`;
  }

  static generateConnectionId (): string {
    return `connection-${Date.now()}-${Math.random().toString(36)
      .substr(2, 9)}`;
  }

  static generateLayoutId (): string {
    return `layout-${Date.now()}-${Math.random().toString(36)
      .substr(2, 9)}`;
  }

  static createDefaultNode (id?: string): GraphNode {
    return {
      'id': id || GraphUtils.generateNodeId(),
      'title': '新节点',
      'connections': 0,
      'type': 'concept',
      'shape': 'circle',
      'description': '',
      'content': '',
      'color': '#3b82f6',
      'size': 100,
      'x': 0,
      'y': 0,
      'z': 0,
      'style': {
        'fill': '#ffffff',
        'stroke': '#3b82f6',
        'strokeWidth': 2,
        'fontSize': 14,
        'textFill': '#1f2937',
        'radius': 50,
        'opacity': 1,
        'arrowCount': 1
      },
      'state': {
        'isExpanded': false,
        'isFixed': false,
        'isSelected': false,
        'isHovered': false,
        'isDragging': false,
        'isCollapsed': false
      },
      'metadata': {
        'slug': '',
        'content': '',
        'is_custom': false,
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'version': 1
      },
      'layout': {
        'x': 0,
        'y': 0,
        'fx': null,
        'fy': null,
        'z': 0,
        'fz': null,
        'isFixed': false,
        'isExpanded': false
      },
      'handles': {
        'handleCount': 4,
        'lockedHandles': {},
        'handleLabels': {}
      },
      'group': {
        'isGroup': false,
        'memberIds': [],
        'isGroupExpanded': false
      },
      'customData': {}
    };
  }

  static createDefaultConnection (
    source: string | GraphNode,
    target: string | GraphNode,
    id?: string
  ): GraphConnection {
    const sourceId = typeof source === 'string' ? source : source.id;
    const targetId = typeof target === 'string' ? target : target.id;

    return {
      'id': id || GraphUtils.generateConnectionId(),
      'source': sourceId,
      'target': targetId,
      'sourceHandle': null,
      'targetHandle': null,
      'type': 'related',
      'weight': 1.0,
      'label': '',
      'style': {
        'stroke': '#3b82f6',
        'strokeWidth': 2,
        'strokeOpacity': 0.8,
        'arrowCount': 1
      },
      'metadata': {
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'version': 1,
        'description': ''
      },
      'state': {
        'isSelected': false,
        'isHovered': false,
        'isEditing': false
      },
      'curveControl': {
        'controlPointsCount': 0,
        'controlPoints': [],
        'curveType': 'default',
        'tension': 0.4,
        'locked': false
      },
      'animation': {
        'dynamicEffect': 'none',
        'animationType': 'none',
        'animationSpeed': 1,
        'animationDirection': 'forward',
        'isAnimating': false
      },
      'customData': {}
    };
  }

  static calculateGraphStats (nodes: GraphNode[], connections: GraphConnection[]) {
    const nodeCount = nodes.length;
    const connectionCount = connections.length;
    const averageNodeConnections = nodeCount > 0 ? connectionCount / nodeCount : 0;
    const graphDensity = nodeCount > 0 ? (2 * connectionCount) / (nodeCount * (nodeCount - 1)) : 0;
    const nodeTypes: Record<string, number> = {};
    const connectionTypes: Record<string, number> = {};

    nodes.forEach(node => {
      const type = node.type || 'unknown';
      nodeTypes[type] = (nodeTypes[type] || 0) + 1;
    });

    connections.forEach(connection => {
      const type = connection.type || 'unknown';
      connectionTypes[type] = (connectionTypes[type] || 0) + 1;
    });

    return {
      nodeCount,
      connectionCount,
      nodeTypes,
      connectionTypes,
      averageNodeConnections,
      graphDensity,
      'clusteringCoefficient': 0,
      'diameter': 0,
      'radius': 0
    };
  }

  static validateGraph (nodes: GraphNode[], connections: GraphConnection[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map(node => node.id));

    connections.forEach(connection => {
      const sourceId = String(connection.source);
      const targetId = String(connection.target);

      if (!nodeIds.has(sourceId)) {
        errors.push(`连接的源节点 ${sourceId} 不存在`);
      }

      if (!nodeIds.has(targetId)) {
        errors.push(`连接的目标节点 ${targetId} 不存在`);
      }

      if (sourceId === targetId) {
        errors.push(`连接不能连接到自身: ${sourceId}`);
      }
    });

    return {
      'isValid': errors.length === 0,
      errors
    };
  }

  static exportToGraphML (nodes: GraphNode[], connections: GraphConnection[]): string {
    const nodeElements = nodes.map(node => {
      return `    <node id="${node.id}" label="${node.title}">
      </node>`;
    }).join('\n');

    const edgeElements = connections.map(connection => {
      const sourceId = String(connection.source);
      const targetId = String(connection.target);
      return `    <edge id="${connection.id}" source="${sourceId}" target="${targetId}" label="${connection.label || connection.type}" />
`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="d0" for="node" attr.name="id" attr.type="string" />
  <key id="d1" for="node" attr.name="label" attr.type="string" />
  <key id="d2" for="edge" id="source" attr.type="string" />
  <key id="d3" for="edge" id="target" attr.type="string" />
  <key id="d4" for="edge" id="label" attr.type="string" />
  <graph id="G" edgedefault="directed">
${nodeElements}
${edgeElements}
  </graph>
</graphml>`;
  }

  static exportToJSON (nodes: GraphNode[], connections: GraphConnection[]): string {
    return JSON.stringify({
      'nodes': nodes.map(node => ({
        'id': node.id,
        'title': node.title,
        'type': node.type,
        'connections': node.connections,
        'description': node.description,
        'content': node.metadata.content,
        'color': node.color,
        'size': node.size,
        'x': node.layout.x,
        'y': node.layout.y
      })),
      'connections': connections.map(connection => ({
        'id': connection.id,
        'source': String(connection.source),
        'target': String(connection.target),
        'type': connection.type,
        'weight': connection.weight,
        'label': connection.label,
        'sourceHandle': connection.sourceHandle,
        'targetHandle': connection.targetHandle
      }))
    }, null, 2);
  }

  static exportToCSV (nodes: GraphNode[], connections: GraphConnection[]): string {
    const headers = ['id', 'title', 'type', 'connections', 'description', 'x', 'y'];
    const nodeRows = nodes.map(node => [
      node.id,
      node.title,
      node.type,
      node.connections,
      node.description || '',
      node.layout.x,
      node.layout.y
    ]);

    const connectionHeaders = ['id', 'source', 'target', 'type', 'weight', 'label'];
    const connectionRows = connections.map(connection => [
      connection.id,
      String(connection.source),
      String(connection.target),
      connection.type,
      connection.weight,
      connection.label || ''
    ]);

    const nodeCSV = [headers.join(','), ...nodeRows.map(row => row.join(','))].join('\n');
    const connectionCSV = [connectionHeaders.join(','), ...connectionRows.map(row => row.join(','))].join('\n');

    return `${nodeCSV}\n\n${connectionCSV}`;
  }

  static importFromJSON (jsonString: string): {
    nodes: GraphNode[];
    connections: GraphConnection[];
  } {
    try {
      const data = JSON.parse(jsonString);
      return {
        'nodes': data.nodes || [],
        'connections': data.connections || []
      };
    } catch {
      return {
        'nodes': [],
        'connections': []
      };
    }
  }

  static importFromCSV (csvString: string): {
    nodes: GraphNode[];
    connections: GraphConnection[];
  } {
    const lines = csvString.trim().split('\n');
    const nodes: GraphNode[] = [];
    const connections: GraphConnection[] = [];

    let isNodesSection = true;

    for (const line of lines) {
      if (line.trim() === '') {
        isNodesSection = false;
      } else {
        const values = line.split(',');
        if (isNodesSection) {
          nodes.push({
            'id': values[0] || '',
            'title': values[1] || '',
            'type': values[2] || 'concept',
            'connections': parseInt(values[3] || '0', 10) || 0,
            'description': values[4] || '',
            'content': '',
            'color': '#3b82f6',
            'size': 100,
            'x': parseFloat(values[5] || '0') || 0,
            'y': parseFloat(values[6] || '0') || 0,
            'z': 0,
            'shape': 'circle',
            'style': {
              'fill': '#ffffff',
              'stroke': '#3b82f6',
              'strokeWidth': 2,
              'fontSize': 14,
              'textFill': '#1f2937',
              'radius': 50,
              'opacity': 1,
              'arrowCount': 1
            },
            'state': {
              'isExpanded': false,
              'isFixed': false,
              'isSelected': false,
              'isHovered': false,
              'isDragging': false,
              'isCollapsed': false
            },
            'metadata': {
              'slug': '',
              'content': '',
              'is_custom': false,
              'createdAt': Date.now(),
              'updatedAt': Date.now(),
              'version': 1
            },
            'layout': {
              'x': parseFloat(values[5] || '0') || 0,
              'y': parseFloat(values[6] || '0') || 0,
              'fx': null,
              'fy': null,
              'z': 0,
              'fz': null,
              'isFixed': false,
              'isExpanded': false
            },
            'handles': {
              'handleCount': 4,
              'lockedHandles': {},
              'handleLabels': {}
            },
            'group': {
              'isGroup': false,
              'memberIds': [],
              'isGroupExpanded': false
            },
            'customData': {}
          });
        } else {
          connections.push({
            'id': values[0] || '',
            'source': values[1] || '',
            'target': values[2] || '',
            'sourceHandle': null,
            'targetHandle': null,
            'type': values[3] || 'related',
            'weight': parseFloat(values[4] || '1.0') || 1.0,
            'label': values[5] || '',
            'style': {
              'stroke': '#3b82f6',
              'strokeWidth': 2,
              'strokeOpacity': 0.8,
              'arrowCount': 1
            },
            'metadata': {
              'createdAt': Date.now(),
              'updatedAt': Date.now(),
              'version': 1,
              'description': ''
            },
            'state': {
              'isSelected': false,
              'isHovered': false,
              'isEditing': false
            },
            'curveControl': {
              'controlPointsCount': 0,
              'controlPoints': [],
              'curveType': 'default',
              'tension': 0.4,
              'locked': false
            },
            'animation': {
              'dynamicEffect': 'none',
              'animationType': 'none',
              'animationSpeed': 1,
              'animationDirection': 'forward',
              'isAnimating': false
            },
            'customData': {}
          });
        }
      }
    }

    return { nodes, connections };
  }
}
