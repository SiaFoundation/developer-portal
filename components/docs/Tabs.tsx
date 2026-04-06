'use client';

import {
  Children,
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from 'react';

// Global tab store — all <Tabs> on the page share the same selected label.
const listeners = new Set<() => void>();
let selectedTab: string | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return selectedTab;
}

function selectTab(label: string) {
  if (selectedTab === label) return;
  selectedTab = label;
  listeners.forEach((cb) => cb());
}

// Context to let nested tabs (e.g. platform sub-tabs) opt out of global sync.
const NestedTabContext = createContext(false);

export function Tabs({
  labels: labelsProp = '',
  children,
}: {
  labels?: string;
  children: ReactNode;
}) {
  const labels = labelsProp ? labelsProp.split(',') : [];
  const childArray = Children.toArray(children).filter(isValidElement);
  const isNested = useContext(NestedTabContext);
  const globalActive = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Use global selection if this tab group contains the globally selected label,
  // otherwise fall back to the first label. Nested tabs always use first label.
  const active =
    !isNested && globalActive && labels.includes(globalActive)
      ? globalActive
      : labels[0];

  function handleClick(label: string) {
    if (!isNested) selectTab(label);
  }

  return (
    <NestedTabContext.Provider value={true}>
      <div className="tabs-root my-4 not-prose rounded-lg overflow-hidden border border-[#2d2d2d] light:border-[#d1d5db] bg-[#0d1117] light:bg-[#f6f8fa]">
        <div className="flex border-b border-[#2d2d2d] light:border-[#d1d5db]">
          {labels.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleClick(label)}
              className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active === label
                  ? 'text-[#0099ff] border-b-2 border-[#0099ff]'
                  : 'text-[#757575] hover:text-[#e7e7e7] light:hover:text-[#1a1a1a]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className={[
            '[&_.code-block]:my-0 [&_.code-block]:border-0',
            '[&_.code-block]:rounded-none [&_.code-block]:bg-transparent',
            '[&_.code-block_.code-lang]:hidden',
            '[&_.tabs-root]:my-0 [&_.tabs-root]:border-0',
            '[&_.tabs-root]:rounded-none [&_.tabs-root]:overflow-visible',
          ].join(' ')}
        >
          {childArray.map((child, index) => (
            <div
              key={labels[index] ?? index}
              className={labels[index] === active ? '' : 'hidden'}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </NestedTabContext.Provider>
  );
}

export function Tab({ children }: { label: string; children: ReactNode }) {
  return <>{children}</>;
}
