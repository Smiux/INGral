import { useState, useEffect, useCallback } from 'react';
import {
  type ReactFlowInstance,
  type Edge,
  type InternalNode,
  getBezierPath,
  Position
} from '@xyflow/react';
import { getNodeIntersectionToPoint, getEdgePosition } from './edgeUtils';

interface UseRightClickConnectOptions<T extends Edge> {
  reactFlowInstance: ReactFlowInstance;
  edges: T[];
  setEdges: React.Dispatch<React.SetStateAction<T[]>>;
  nodeLookup: Map<string, InternalNode>;
  transform: [number, number, number];
  lineColor: string;
  createEdge: (sourceId: string, targetId: string) => T;
}

export function useRightClickConnect<T extends Edge> (options: UseRightClickConnectOptions<T>) {
  const {
    reactFlowInstance,
    edges,
    setEdges,
    nodeLookup,
    transform,
    lineColor,
    createEdge
  } = options;

  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectionMousePos, setConnectionMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) {
      return;
    }
    const nodeElement = (e.target as HTMLElement).closest('.react-flow__node');
    if (!nodeElement) {
      return;
    }
    const nodeId = nodeElement.getAttribute('data-id');
    if (!nodeId) {
      return;
    }
    e.preventDefault();
    setConnectingFrom(nodeId);
    const flowPos = reactFlowInstance.screenToFlowPosition({
      'x': e.clientX,
      'y': e.clientY
    });
    setConnectionMousePos(flowPos);
  }, [reactFlowInstance]);

  useEffect(() => {
    if (!connectingFrom) {
      return () => {};
    }

    const handleMouseMove = (e: MouseEvent) => {
      const flowPos = reactFlowInstance.screenToFlowPosition({
        'x': e.clientX,
        'y': e.clientY
      });
      setConnectionMousePos(flowPos);

      const nodeElement = (e.target as HTMLElement).closest('.react-flow__node');
      if (nodeElement) {
        const targetId = nodeElement.getAttribute('data-id');
        setHoveredTargetId(targetId && targetId !== connectingFrom ? targetId : null);
      } else {
        setHoveredTargetId(null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) {
        return;
      }
      if (connectingFrom) {
        const nodeElement = (e.target as HTMLElement).closest('.react-flow__node');
        if (nodeElement) {
          const targetId = nodeElement.getAttribute('data-id');
          if (targetId && targetId !== connectingFrom) {
            const existingEdge = edges.find(
              edge => edge.source === connectingFrom && edge.target === targetId
            );
            if (!existingEdge) {
              const newEdge = createEdge(connectingFrom, targetId);
              setEdges((eds) => [...eds, newEdge]);
            }
          }
        }
        setConnectingFrom(null);
        setConnectionMousePos(null);
        setHoveredTargetId(null);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [connectingFrom, edges, setEdges, reactFlowInstance, createEdge]);

  const renderConnectionLine = () => {
    if (!connectingFrom || !connectionMousePos) {
      return null;
    }

    const sourceInternalNode = nodeLookup.get(connectingFrom);
    if (!sourceInternalNode) {
      return null;
    }

    const intersectionPoint = getNodeIntersectionToPoint(sourceInternalNode, connectionMousePos);
    const sourcePos = getEdgePosition(sourceInternalNode, intersectionPoint);

    const dx = connectionMousePos.x - intersectionPoint.x;
    const dy = connectionMousePos.y - intersectionPoint.y;
    let targetPos: Position;
    if (Math.abs(dx) > Math.abs(dy)) {
      targetPos = dx > 0 ? Position.Right : Position.Left;
    } else {
      targetPos = dy > 0 ? Position.Bottom : Position.Top;
    }

    const [edgePath] = getBezierPath({
      'sourceX': intersectionPoint.x,
      'sourceY': intersectionPoint.y,
      'sourcePosition': sourcePos,
      'targetX': connectionMousePos.x,
      'targetY': connectionMousePos.y,
      'targetPosition': targetPos
    });

    const scale = transform[2];

    return (
      <svg
        style={{
          'position': 'absolute',
          'top': 0,
          'left': 0,
          'width': '100%',
          'height': '100%',
          'pointerEvents': 'none',
          'zIndex': 5
        }}
      >
        <g transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`}>
          <path
            d={edgePath}
            stroke={lineColor}
            strokeWidth={2 / scale}
            fill="none"
            strokeDasharray={`${5 / scale}`}
          />
          <circle
            cx={connectionMousePos.x}
            cy={connectionMousePos.y}
            fill="#fff"
            r={3 / scale}
            stroke={lineColor}
            strokeWidth={2 / scale}
          />
          {hoveredTargetId && (() => {
            const targetNode = nodeLookup.get(hoveredTargetId);
            if (!targetNode) {
              return null;
            }
            const width = targetNode.measured?.width || 0;
            const height = targetNode.measured?.height || 0;
            const pos = targetNode.internals?.positionAbsolute || { 'x': 0, 'y': 0 };
            return (
              <rect
                x={pos.x - 4 / scale}
                y={pos.y - 4 / scale}
                width={width + 8 / scale}
                height={height + 8 / scale}
                rx={4 / scale}
                fill="none"
                stroke={lineColor}
                strokeWidth={2 / scale}
                strokeDasharray={`${6 / scale}`}
                opacity={0.6}
              />
            );
          })()}
        </g>
      </svg>
    );
  };

  return {
    handleCanvasMouseDown,
    renderConnectionLine
  };
}
