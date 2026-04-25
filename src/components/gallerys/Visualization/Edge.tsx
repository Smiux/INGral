import { memo, useState, useCallback } from 'react';
import {
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getSimpleBezierPath,
  type EdgeProps,
  useReactFlow
} from '@xyflow/react';
import type { ArticleEdgeData } from '@/components/gallerys/gallery';

const PATH_GENERATORS = {
  'straight': getStraightPath,
  'smoothstep': getSmoothStepPath,
  'simplebezier': getSimpleBezierPath,
  'default': getBezierPath
} as const;

export const ArticleEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
  markerEnd
}: EdgeProps) => {
  const edgeData = data as ArticleEdgeData | undefined;
  const curveType = edgeData?.curveType || 'default';
  const reactFlowInstance = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const getPath = PATH_GENERATORS[curveType] || getBezierPath;
  const [edgePath, labelX, labelY] = getPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const stroke = selected ? '#0ea5e9' : '#4ECDC4';
  const strokeWidth = selected ? 3 : 2;

  const edgeStyle = {
    stroke,
    strokeWidth,
    ...style
  };

  const updateEdgeLabel = useCallback((value: string) => {
    const edges = reactFlowInstance.getEdges();
    const updatedEdges = edges.map((edge) =>
      edge.id === id
        ? { ...edge, 'data': { ...edge.data, 'relationshipType': value } }
        : edge
    );
    reactFlowInstance.setEdges(updatedEdges);
  }, [id, reactFlowInstance]);

  const handleLabelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(edgeData?.relationshipType || '');
    setIsEditing(true);
  }, [edgeData?.relationshipType]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    updateEdgeLabel(editValue);
  }, [editValue, updateEdgeLabel]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [handleInputBlur]);

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className="react-flow__edge-path"
        style={edgeStyle}
        markerEnd={markerEnd}
      />

      <EdgeLabelRenderer>
        <div
          className={`
            absolute transform -translate-x-1/2 -translate-y-1/2
            ${isEditing ? '' : 'pointer-events-none'}
          `}
          style={{
            'left': labelX,
            'top': labelY
          }}
        >
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              autoFocus
              className="px-2 py-1 text-xs font-medium rounded border-2 border-sky-500 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none min-w-[60px]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className={`
                px-2 py-1 rounded text-xs font-medium
                bg-white dark:bg-neutral-800
                border border-neutral-200 dark:border-neutral-700
                pointer-events-auto cursor-pointer
                hover:border-sky-300 dark:hover:border-sky-600
                transition-colors
                ${selected ? 'text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-600' : 'text-neutral-600 dark:text-neutral-400'}
              `}
              onClick={handleLabelClick}
            >
              {edgeData?.relationshipType || '默认'}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
