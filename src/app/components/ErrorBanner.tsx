import { AlertCircle } from 'lucide-react';

/**
 * Shared inline error display for form/save/fetch errors.
 *
 * Standardizes the red-text/red-alert pattern already used in most modules
 * (`bg-red-50 border-red-200`/`text-red-600` — see `Accounting.tsx`,
 * `HR.tsx`, `School.tsx`, `Projects.tsx`, `Add*Modal.tsx`) rather than
 * inventing a new visual language.
 */

interface ErrorBannerProps {
  /** The error message to display. Renders nothing when falsy/empty. */
  message?: string | null;
  className?: string;
}

export function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className={`flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg ${className}`}
    >
      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
