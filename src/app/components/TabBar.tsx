import React from 'react';

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon: React.ElementType;
}

export interface TabBarProps<T extends string> {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  /**
   * When true, tab labels are hidden below the `sm` breakpoint (icon-only on
   * mobile) and horizontal padding is reduced on small screens. Used by
   * modules with many tabs that need to fit on narrow viewports.
   */
  compact?: boolean;
}

/**
 * Shared top-level module tab bar. Matches the majority tab-bar pattern used
 * across Accounting, HR, School, Projects, ICT admin-style modules, and
 * LeadManagement: a horizontally scrollable row of icon+label buttons with a
 * green underline/background active state.
 */
export function TabBar<T extends string>({ tabs, active, onChange, compact }: TabBarProps<T>) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 ${
            compact ? 'px-3 sm:px-4' : 'px-4'
          } py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px ${
            active === t.id
              ? 'border-[#14856E] text-[#14856E] bg-green-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <t.icon size={16} />
          <span className={compact ? 'hidden sm:inline' : undefined}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
