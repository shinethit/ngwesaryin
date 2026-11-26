import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// [v7.6.51] Visibility gate for recharts charts.
//
// Root cause of the repeated console warnings ("The width(0) and
// height(0) of chart should be greater than 0"): App.tsx keeps every
// tab MOUNTED but hidden with CSS (display:none), so every
// ResponsiveContainer inside a hidden tab measures 0x0 — on mount
// AND on every re-render while hidden — and recharts warns each
// time. The fixed-height wrapper divs already preserve layout, so
// this gate renders the chart only while its own box has a real
// size, and unmounts it again when the box collapses to zero (the
// tab is hidden). When the tab is shown, ResizeObserver fires and
// the chart mounts with a real size, so the warning is never
// emitted. The gate div fills the fixed-height parent, so chart
// size and layout are unchanged.
export function DeferredChart({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setVisible(rect.width > 0 && rect.height > 0);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      {visible ? children : null}
    </div>
  );
}
