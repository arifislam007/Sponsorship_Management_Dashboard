import { FileX, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 p-6 rounded-full">
          <FileX size={48} className="text-gray-400" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors"
        >
          <Plus size={20} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
