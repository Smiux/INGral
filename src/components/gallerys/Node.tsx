import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ArticleNodeData } from '@/components/gallerys/gallery';

const DEFAULT_STYLE = {
  'fill': '#f8fafc',
  'stroke': '#4ECDC4',
  'strokeWidth': 2,
  'textColor': '#64748b',
  'titleBackgroundColor': '#4ECDC4',
  'titleTextColor': '#FFFFFF'
};

const HIDDEN_HANDLE_STYLE: React.CSSProperties = {
  'opacity': 0,
  'pointerEvents': 'none',
  'width': 1,
  'height': 1,
  'minWidth': 0,
  'minHeight': 0,
  'position': 'absolute',
  'border': 'none',
  'background': 'transparent'
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
        relative bg-slate-50/90 dark:bg-slate-900/90
        border-2 rounded
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
          className="absolute -inset-1 rounded opacity-20 blur-sm"
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
        type="source"
        id="source"
        position={Position.Right}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Handle
        type="target"
        id="target"
        position={Position.Left}
        style={HIDDEN_HANDLE_STYLE}
      />
    </div>
  );
});

ArticleNode.displayName = 'ArticleNode';

export default ArticleNode;
