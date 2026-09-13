import type { LucideIcon } from 'lucide-react';

/**
 * Shared "nothing here yet" surface for empty lists/tables.
 *
 * Purpose-built for this app (not restored from the previously-deleted,
 * unused `EmptyState.tsx`) — see `UI_DEVELOPMENT_PLAN.md` Phase 0/2.
 * Meant to be dropped into the same spot a module currently renders an
 * ad hoc "No X found" message (inside a `<tbody>`/`<td colSpan>`, or as a
 * standalone panel below a filter bar).
 */

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** Adds the standard white/rounded-xl/border card look for standalone (non-table) usage. */
  bordered?: boolean;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, bordered = false, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${
        bordered ? 'bg-white rounded-xl border border-gray-200' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 border border-gray-100 mb-4">
        <Icon size={22} className="text-gray-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1 max-w-sm">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] transition-colors"
        >
          {action.icon && <action.icon size={16} aria-hidden="true" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
