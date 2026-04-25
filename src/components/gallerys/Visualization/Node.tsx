import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ArticleNodeData } from '@/components/gallerys/gallery';

const DEFAULT_STYLE = {
  'fill': '#ffffff',
  'stroke': '#4ECDC4',
  'strokeWidth': 2,
  'textColor': '#666666',
  'titleBackgroundColor': '#4ECDC4',
  'titleTextColor': '#FFFFFF'
};

export const ArticleNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ArticleNodeData;
  const {
    articleTitle,
    articleSummary,
    coverImage,
    tags
  } = nodeData;

  return (
    <div
      className={`
        relative bg-white dark:bg-neutral-800
        border-2 rounded-lg shadow-md
        transition-all duration-200
        ${selected ? 'ring-2 ring-sky-500 ring-offset-2' : ''}
      `}
      style={{
        'borderColor': DEFAULT_STYLE.stroke,
        'borderWidth': `${DEFAULT_STYLE.strokeWidth}px`,
        'minWidth': 10,
        'maxWidth': 3000
      }}
    >
      {selected && (
        <div
          className="absolute -inset-1 rounded-lg opacity-20 blur-sm"
          style={{ 'backgroundColor': DEFAULT_STYLE.stroke }}
        />
      )}

      {coverImage && (
        <div className="w-full overflow-hidden rounded-t-lg">
          <img
            src={coverImage}
            alt={articleTitle}
            className="w-full h-auto max-h-48 object-cover"
          />
        </div>
      )}

      <div className="p-3">
        <div
          className="text-sm font-semibold mb-1 px-2 py-1 rounded break-words max-w-xs"
          style={{
            'backgroundColor': DEFAULT_STYLE.titleBackgroundColor,
            'color': DEFAULT_STYLE.titleTextColor
          }}
          title={articleTitle}
        >
          {articleTitle}
        </div>

        {articleSummary && (
          <div
            className="text-xs mb-2 break-words max-w-xs"
            style={{ 'color': DEFAULT_STYLE.textColor }}
            title={articleSummary}
          >
            {articleSummary}
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {tags.map((tag: string, index: number) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-xs rounded-full"
                style={{
                  'backgroundColor': `hsl(${index * 60 % 360}, 70%, 90%)`,
                  'color': `hsl(${index * 60 % 360}, 70%, 30%)`
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white"
        style={{ 'top': -2 }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white"
        style={{ 'right': -2 }}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white"
        style={{ 'bottom': -2 }}
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white"
        style={{ 'left': -2 }}
      />
    </div>
  );
});

ArticleNode.displayName = 'ArticleNode';

export default ArticleNode;
