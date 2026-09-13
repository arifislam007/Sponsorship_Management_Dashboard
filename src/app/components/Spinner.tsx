import { Loader2 } from 'lucide-react';

/**
 * Shared loading indicator.
 *
 * Standardizes the "spinner + label" treatment already used in the more
 * polished modules (`ICT.tsx`, `Accounting.tsx`, `Admin.tsx`:
 * `<Loader2 className="animate-spin" /> Loading …`) so every module can use
 * the same visual language instead of a bare "Loading…" text string.
 */

interface LoadingStateProps {
  /** Text shown next to the spinner. Defaults to a generic "Loading…". */
  label?: string;
  /** Extra classes on the outer wrapper (e.g. to override vertical padding). */
  className?: string;
  /** Use taller vertical padding for a full tab/page loading state (py-16) vs. a smaller inline one (py-12). */
  fullHeight?: boolean;
}

export function LoadingState({ label = 'Loading…', className = '', fullHeight = false }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 text-sm text-gray-500 ${fullHeight ? 'py-16' : 'py-12'} ${className}`}
    >
      <Loader2 size={18} className="animate-spin text-gray-400" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
