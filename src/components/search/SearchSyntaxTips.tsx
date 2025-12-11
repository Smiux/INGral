
import styles from './SearchBox.module.css';

// 高级搜索语法提示项接口
export interface SyntaxTip {
  id: string;
  syntax: string;
  description: string;
  example: string;
  category: 'boolean' | 'quote' | 'range' | 'field';
}

interface SearchSyntaxTipsProps {
  syntaxTips: SyntaxTip[];
  onSyntaxTipClick: (tip: SyntaxTip) => void;
}

export function SearchSyntaxTips({
  syntaxTips,
  onSyntaxTipClick
}: SearchSyntaxTipsProps) {
  return (
    <div className={styles.syntaxTipsContainer}>
      <div className={styles.syntaxTipsTitle}>高级搜索语法：</div>
      <div className={styles.syntaxTipsList}>
        {syntaxTips.map(tip => (
          <button
            key={tip.id}
            type="button"
            className={styles.syntaxTipItem}
            onClick={() => onSyntaxTipClick(tip)}
            aria-label={`添加搜索语法: ${tip.syntax}`}
            title={tip.description}
          >
            <span className={styles.syntaxTipSyntax}>{tip.syntax}</span>
            <span className={styles.syntaxTipDescription}>{tip.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
