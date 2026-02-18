
import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Save, Copy } from 'lucide-react';

import 'mathlive';
import 'mathlive/static.css';

interface MathLiveFieldElement extends HTMLElement {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  dispatchEvent: (event: Event) => boolean;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.HTMLAttributes<MathLiveFieldElement> & React.RefAttributes<MathLiveFieldElement> & {
        value?: string;
        onChange?: React.FormEventHandler<MathLiveFieldElement>;
        onInput?: React.FormEventHandler<MathLiveFieldElement>;
        onFocus?: React.FocusEventHandler<MathLiveFieldElement>;
        onBlur?: React.FocusEventHandler<MathLiveFieldElement>;
        smartMode?: boolean;
        virtualKeyboardMode?: 'auto' | 'manual' | 'onfocus' | 'off';
        keyboardLayout?: string;
        fontSize?: string;
        fontFamily?: string;
        mathStyle?: 'displaystyle' | 'textstyle';
        color?: string;
        backgroundColor?: string;
        readOnly?: boolean;
        placeholder?: string;
      };
    }
  }
}
interface LatexEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (_formula: string) => void;
  initialFormula?: string;
}

export function LatexEditor ({ isOpen, onClose, onInsert, initialFormula = '' }: LatexEditorProps) {
  const [formula, setFormula] = useState(initialFormula);

  const modalRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<MathLiveFieldElement>(null);

  const handleClose = useCallback(() => {
    onClose();
    setFormula('');
  }, [onClose]);

  const handleInsert = () => {
    if (formula.trim()) {
      try {
        onInsert(formula);
      } catch (error) {
        console.error('Error inserting formula:', error);
      } finally {
        handleClose();
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
  };

  const handleClear = () => {
    setFormula('');
    if (mathFieldRef.current && typeof mathFieldRef.current.setValue === 'function') {
      mathFieldRef.current.setValue('');
    }
  };

  const handleMathFieldInput = (event: React.FormEvent<MathLiveFieldElement>) => {
    const mathField = event.currentTarget;
    if (mathField && typeof mathField.getValue === 'function') {
      setFormula(mathField.getValue());
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg w-full max-w-3xl max-h-[70vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">LaTeX公式编辑器</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="editor-panel">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700">公式编辑</h3>
                <button
                  onClick={handleClear}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                >
                  清除
                </button>
              </div>

              <math-field
                ref={mathFieldRef}
                value={formula}
                onInput={handleMathFieldInput}
                onChange={handleMathFieldInput}
                smartMode={true}
                virtualKeyboardMode="manual"
                mathStyle="displaystyle"
                fontSize="1.25rem"
                placeholder="输入LaTeX公式..."
                className="w-full min-h-40 max-h-[40vh] p-4 border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y overflow-auto"
                style={{ 'width': '100%', 'maxWidth': '100%', 'minWidth': '100%', 'display': 'block' }}
              ></math-field>
            </div>
          </div>

        </div>
        <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-end items-center">
          <div className="flex space-x-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 border border-blue-500 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center"
            >
              <Copy className="w-4 h-4 mr-1" />
              复制公式
            </button>
            <button
              onClick={handleInsert}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-1" />
              插入公式
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
