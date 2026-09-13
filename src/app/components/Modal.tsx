import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Shared accessible modal wrapper.
 *
 * Provides the outer backdrop + dialog semantics (role="dialog",
 * aria-modal, aria-labelledby), Escape-to-close, a manual focus trap, and
 * focus-in/focus-return behavior. It intentionally does NOT dictate any
 * header/footer layout — callers render their own internal markup as
 * `children` and just need to pass a `titleId` that matches the `id` on
 * their own title element.
 */

interface ModalProps {
  /** Called when the modal should close (Escape key, or backdrop click if enabled). */
  onClose: () => void;
  /**
   * Id of the element (usually the modal's <h2>/<h3> title) that labels this
   * dialog for assistive tech. If omitted, one is auto-generated via
   * useId(), but callers should generally pass their own id and set it on
   * their title element so aria-labelledby resolves to something real.
   */
  titleId?: string;
  /**
   * Whether clicking the backdrop (outside the dialog panel) closes the
   * modal. Defaults to false to preserve each modal's pre-existing
   * behavior (none of the migrated modals closed on backdrop click before).
   */
  closeOnBackdropClick?: boolean;
  /** Extra classes for the fixed backdrop wrapper (e.g. a custom z-index). */
  overlayClassName?: string;
  /** Classes for the actual dialog panel (the white card). */
  containerClassName?: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export function Modal({
  onClose,
  titleId: providedTitleId,
  closeOnBackdropClick = false,
  overlayClassName = 'z-50',
  containerClassName = '',
  children,
}: ModalProps) {
  const generatedId = useId();
  const titleId = providedTitleId || `modal-title-${generatedId}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // On mount: remember what had focus, then move focus into the dialog.
  // On unmount: return focus to whatever triggered the modal.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const node = dialogRef.current;
    const focusables = node ? getFocusableElements(node) : [];
    const target = focusables[0] || node;
    // Defer slightly so the dialog's own DOM is fully painted before focusing.
    const raf = requestAnimationFrame(() => {
      target?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  // Escape-to-close + manual focus trap.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const node = dialogRef.current;
      if (!node) return;

      const focusables = getFocusableElements(node);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !active || !node.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !active || !node.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 ${overlayClassName}`}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={containerClassName}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
