import React from 'react';
import Link from 'next/link';

interface EmptyTableStateProps {
  colSpan: number;
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyTableState({
  colSpan,
  icon = 'inbox',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyTableStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-12 text-center text-gray-500">
        <div className="flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">{icon}</span>
          <p className="font-bold text-gray-900 text-lg">{title}</p>
          {description && <p className="text-sm mt-1 mb-4">{description}</p>}
          {actionLabel && actionHref && (
            <Link
              href={actionHref}
              className="px-6 py-2 bg-[#2d9a33] text-white rounded-lg font-bold hover:bg-[#25822a] transition-colors"
            >
              {actionLabel}
            </Link>
          )}
          {actionLabel && onAction && !actionHref && (
            <button
              onClick={onAction}
              className="px-6 py-2 bg-[#2d9a33] text-white rounded-lg font-bold hover:bg-[#25822a] transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
