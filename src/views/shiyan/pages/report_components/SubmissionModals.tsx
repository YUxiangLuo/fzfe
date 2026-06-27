import React from 'react';
import { CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';

const splitMarkdownTableRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const isMarkdownTableSeparator = (line: string): boolean => {
  const cells = splitMarkdownTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
};

const renderInlineMarkdown = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((part) => part.length > 0);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
};

const renderHeading = (level: number, content: React.ReactNode[], key: string) => {
  switch (level) {
    case 1:
      return <h1 key={key} className="text-3xl font-bold text-gray-900 mt-2 mb-4">{content}</h1>;
    case 2:
      return <h2 key={key} className="text-2xl font-semibold text-gray-900 mt-8 mb-3">{content}</h2>;
    case 3:
      return <h3 key={key} className="text-xl font-semibold text-gray-800 mt-6 mb-2">{content}</h3>;
    default:
      return <h4 key={key} className="text-lg font-semibold text-gray-800 mt-4 mb-2">{content}</h4>;
  }
};

const renderMarkdownPreview = (markdown: string): React.ReactNode[] => {
  const lines = markdown.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const blockKey = `preview-block-${blocks.length}`;

    if (/^-{3,}$/.test(trimmed)) {
      blocks.push(<hr key={blockKey} className="my-6 border-gray-200" />);
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push(renderHeading(
        headingMatch[1]!.length,
        renderInlineMarkdown(headingMatch[2]!, blockKey),
        blockKey,
      ));
      index += 1;
      continue;
    }

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('|')) {
        tableLines.push((lines[index] ?? '').trim());
        index += 1;
      }

      const rows = tableLines
        .filter((tableLine) => !isMarkdownTableSeparator(tableLine))
        .map(splitMarkdownTableRow);
      const [header, ...bodyRows] = rows;

      if (header) {
        blocks.push(
          <div key={blockKey} className="my-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {header.map((cell, cellIndex) => (
                    <th key={`${blockKey}-head-${cellIndex}`} className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                      {renderInlineMarkdown(cell, `${blockKey}-head-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {bodyRows.map((row, rowIndex) => (
                  <tr key={`${blockKey}-row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${blockKey}-cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                        {renderInlineMarkdown(cell, `${blockKey}-cell-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = [];
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('- ')) {
        items.push((lines[index] ?? '').trim().slice(2).trim());
        index += 1;
      }

      blocks.push(
        <ul key={blockKey} className="my-4 list-disc space-y-1 pl-6 text-gray-700">
          {items.map((item, itemIndex) => (
            <li key={`${blockKey}-item-${itemIndex}`}>
              {renderInlineMarkdown(item, `${blockKey}-item-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const currentLine = lines[index] ?? '';
      const currentTrimmed = currentLine.trim();
      if (
        !currentTrimmed ||
        /^#{1,4}\s+/.test(currentTrimmed) ||
        /^-{3,}$/.test(currentTrimmed) ||
        currentTrimmed.startsWith('|') ||
        currentTrimmed.startsWith('- ')
      ) {
        break;
      }
      paragraphLines.push(currentTrimmed);
      index += 1;
    }

    blocks.push(
      <p key={blockKey} className="my-3 leading-7 text-gray-700">
        {paragraphLines.map((paragraphLine, lineIndex) => (
          <React.Fragment key={`${blockKey}-line-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {renderInlineMarkdown(paragraphLine, `${blockKey}-line-${lineIndex}`)}
          </React.Fragment>
        ))}
      </p>,
    );
  }

  return blocks;
};

interface CompletionModalProps {
  countdown: number;
  onLogout: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({ countdown, onLogout }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
      <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">恭喜！实验完成</h2>
      <p className="text-gray-600 mb-6">您的实验报告已成功提交并保存。</p>
      <div className="space-y-3">
        <button
          onClick={onLogout}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          退出登录 ({countdown})
        </button>
      </div>
    </div>
  </div>
);

interface ReportPreviewModalProps {
  markdown: string;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  markdown,
  isSubmitting,
  submitError,
  onClose,
  onConfirm,
}) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 id="report-preview-title" className="text-2xl font-bold text-gray-900">报告预览</h2>
          <p className="text-sm text-gray-500 mt-1">请确认报告内容无误后再提交。提交后本次实验将完成并退出登录。</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="关闭预览"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-5">
        <article className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          {renderMarkdownPreview(markdown)}
        </article>
      </div>

      <div className="border-t border-gray-200 bg-white px-6 py-4">
        {submitError && <p className="mb-3 text-sm text-red-600">{submitError}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            返回修改
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                正在提交...
              </>
            ) : (
              '确认无误，提交报告'
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface ValidationErrorModalProps {
  onClose: () => void;
}

export const ValidationErrorModal: React.FC<ValidationErrorModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
      <div className="mx-auto flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
        <AlertTriangle className="w-10 h-10 text-yellow-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">内容不完整</h2>
      <p className="text-gray-600 mb-6">
        请检查并确保所有部分的分析内容都已填写。
      </p>
      <button
        onClick={onClose}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
      >
        返回修改
      </button>
    </div>
  </div>
);
