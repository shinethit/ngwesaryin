// [v7.6.27] Print-only statement view. This renders ONLY inside the
// #ngwe-print-root portal (mounted on demand by AnalyticsView when
// the user taps Print) or inside the #ngwe-preview-root overlay (the
// iOS standalone fallback, v7.6.36); on screen it is hidden by CSS
// in index.css, and in print the stylesheet hides everything else.
// Plain semantic markup so the browser paginates naturally: thead
// repeats, rows never split across pages (break-inside: avoid in
// print CSS). [v7.6.36] The totals table is now a donut chart
// (income vs expense slices; the balance is the centre label, never
// a slice) and the category table is a stacked-column chart; the
// detail list is grouped category → sub-category → records.
import React from 'react';
import type { StatementData } from '../utils/statementData';
import {
  flowShares,
  groupStatementDetails,
  percentOf,
} from '../utils/statementData';
import { formatMMK, formatLakhs, formatDateDisplay, formatShortDate } from '../utils/formatters';

interface StatementPrintViewProps {
  data: StatementData;
  lang: 'my' | 'en';
  /** Wallet-scope line, e.g. included-wallets count (AnalyticsView). */
  walletScopeLabel: string;
}

function pct(percent: number | null): string {
  return percent === null ? '—' : `${percent}%`;
}

// [v7.6.50] Stacked-column chart model (expense categories, largest
// first). Segment colours cycle a fixed white-text-safe palette in
// chart order; the legend carries every segment too short for a
// full in-chart label.
interface ChartSegment {
  key: string;
  name: string;
  total: number;
  percent: number | null;
  color: string;
  x: number;
  y: number;
  h: number;
  label: 'full' | 'pct' | 'num' | 'none';
  legendNo: number | null;
}

interface ChartSourceColumn {
  key: string;
  name: string;
  total: number;
  percent: number | null;
  subs: { key: string; name: string; total: number; percent: number | null }[];
}

interface ChartColumn {
  key: string;
  name: string;
  total: number;
  percent: number | null;
  segments: ChartSegment[];
}

// [v7.6.50] Code-point slicing splits Burmese base+mark pairs and
// drops the final glyph of words like "သိန်း" (combining marks count
// as separate code points). Segment by grapheme cluster so a
// truncated label never ends mid-glyph.
const GRAPHEME_SEGMENTER: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
function truncateChartLabel(name: string, maxChars: number): string {
  const graphemes = GRAPHEME_SEGMENTER
    ? [...GRAPHEME_SEGMENTER.segment(name)].map((s) => s.segment)
    : Array.from(name);
  if (graphemes.length <= maxChars) return name;
  return graphemes.slice(0, Math.max(1, maxChars - 1)).join('') + '…';
}

export const StatementPrintView: React.FC<StatementPrintViewProps> = ({
  data,
  lang,
  walletScopeLabel,
}) => {
  const periodLabel =
    data.start === null && data.end === null
      ? lang === 'my'
        ? 'အချိန်အားလုံး'
        : 'All time'
      : `${formatDateDisplay(data.start || '', lang)} — ${formatDateDisplay(data.end || '', lang)}`;

  const generalLabel = lang === 'my' ? 'အထွေထွေ' : 'General';
  const groups = groupStatementDetails(data, generalLabel);

  // Donut geometry: pathLength=100 makes dash units whole percents;
  // dashoffset 25 starts the first slice at the top.
  const { incomeShare, expenseShare } = flowShares(data.income, data.expense);
  const incomePct = percentOf(data.income, data.income + data.expense);
  const expensePct = percentOf(data.expense, data.income + data.expense);
  const hasFlow = data.income + data.expense > 0;

  // [v7.6.50] Stacked-column chart: capped at 8 columns plus one
  // 'Other' column aggregating the tail, so labels stay readable on
  // a phone-width preview. Segments stack bottom-up in data order;
  // heights are proportional to the largest column total.
  const CHART_MAX_COLUMNS = 8;
  const CHART_W = 600;
  const CHART_H = 230;
  const CHART_SEGMENT_COLORS = [
    '#059669', '#0284c7', '#ea580c', '#7c3aed', '#db2777', '#a16207',
    '#dc2626', '#0891b2', '#65a30d', '#9333ea', '#0d9488', '#be185d',
  ];
  const chartOtherTail = data.categories.slice(CHART_MAX_COLUMNS);
  const chartOtherTotal = chartOtherTail.reduce((sum, c) => sum + c.total, 0);
  const chartOtherName = lang === 'my'
    ? `အခြား (${chartOtherTail.length} ကဏ္ဍ)`
    : `Other (${chartOtherTail.length} categories)`;
  const chartSource: ChartSourceColumn[] = [];
  for (const c of data.categories.slice(0, CHART_MAX_COLUMNS)) {
    const positive = c.subs.filter((s) => s.total > 0);
    chartSource.push({
      key: c.categoryId,
      name: c.name,
      total: c.total,
      percent: c.percent,
      subs: positive.length > 0
        ? positive.map((s) => ({ key: s.subCategoryId || 'general', name: s.name, total: s.total, percent: s.percent }))
        : [{ key: 'all', name: c.name, total: c.total, percent: null }],
    });
  }
  if (chartOtherTail.length > 0) {
    chartSource.push({
      key: '__other__',
      name: chartOtherName,
      total: chartOtherTotal,
      percent: percentOf(chartOtherTotal, data.expense),
      subs: [{ key: '__other__', name: chartOtherName, total: chartOtherTotal, percent: null }],
    });
  }
  const chartMax = Math.max(1, ...chartSource.map((c) => c.total));
  const chartBand = chartSource.length > 0 ? CHART_W / chartSource.length : CHART_W;
  const chartColW = Math.min(56, chartBand * 0.62);
  const chartLegend: { no: number; color: string; catName: string; name: string; total: number; percent: number | null }[] = [];
  let chartColorIdx = 0;
  const chartColumns: ChartColumn[] = chartSource.map((col, ci) => {
    const x = chartBand * ci + (chartBand - chartColW) / 2;
    let cursor = CHART_H;
    const segments: ChartSegment[] = col.subs.map((s) => {
      const h = (s.total / chartMax) * CHART_H;
      const y = cursor - h;
      cursor -= h;
      const color = CHART_SEGMENT_COLORS[chartColorIdx % CHART_SEGMENT_COLORS.length];
      chartColorIdx += 1;
      const label: ChartSegment['label'] = h >= 34 ? 'full' : h >= 18 ? 'pct' : h >= 12 ? 'num' : 'none';
      let legendNo: number | null = null;
      if (label === 'num' || label === 'none') {
        legendNo = chartLegend.length + 1;
        chartLegend.push({ no: legendNo, color, catName: col.name, name: s.name, total: s.total, percent: s.percent });
      }
      return { key: `${col.key}::${s.key}`, name: s.name, total: s.total, percent: s.percent, color, x, y, h, label, legendNo };
    });
    return { key: col.key, name: col.name, total: col.total, percent: col.percent, segments };
  });

  return (
    <div className="stmt">
      <h1 className="stmt-title">
        {lang === 'my' ? 'စာရင်းရှင်းတမ်း' : 'Statement'} — NgweSarYin
      </h1>
      <p className="stmt-meta">
        {periodLabel}
        <br />
        {walletScopeLabel}
      </p>

      <h2 className="stmt-heading">
        {lang === 'my' ? 'ဝင်ငွေ၊ ထွက်ငွေ၊ လက်ကျန်' : 'Income, expense & balance'}
      </h2>
      <div className="stmt-donut-wrap">
        <svg
          className="stmt-donut"
          viewBox="0 0 120 120"
          role="img"
          aria-label={
            lang === 'my'
              ? `ဝင်ငွေ ${pct(incomePct)}၊ ထွက်ငွေ ${pct(expensePct)}`
              : `Income ${pct(incomePct)}, expense ${pct(expensePct)}`
          }
        >
          <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="18" />
          {hasFlow && (
            <>
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#047857"
                strokeWidth="18"
                pathLength={100}
                strokeDasharray={`${incomeShare * 100} ${100 - incomeShare * 100}`}
                strokeDashoffset={25}
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#be123c"
                strokeWidth="18"
                pathLength={100}
                strokeDasharray={`${expenseShare * 100} ${100 - expenseShare * 100}`}
                strokeDashoffset={25 - incomeShare * 100}
              />
            </>
          )}
          <text x="60" y="58" textAnchor="middle" className="stmt-donut-balance">
            {formatMMK(data.balance)}
          </text>
          <text x="60" y="72" textAnchor="middle" className="stmt-donut-label">
            {lang === 'my' ? 'လက်ကျန်' : 'Balance'}
          </text>
        </svg>
        <div className="stmt-legend">
          <div className="stmt-legend-row">
            <span className="stmt-dot stmt-dot-income" />
            <span className="stmt-legend-name">{lang === 'my' ? 'ဝင်ငွေ' : 'Income'}</span>
            <span className="stmt-num stmt-income">+{formatMMK(data.income)}</span>
            <span className="stmt-num">{pct(incomePct)}</span>
          </div>
          <div className="stmt-legend-row">
            <span className="stmt-dot stmt-dot-expense" />
            <span className="stmt-legend-name">{lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}</span>
            <span className="stmt-num stmt-expense">−{formatMMK(data.expense)}</span>
            <span className="stmt-num">{pct(expensePct)}</span>
          </div>
          <div className="stmt-legend-row">
            <span className="stmt-dot stmt-dot-balance" />
            <span className="stmt-legend-name">{lang === 'my' ? 'လက်ကျန်' : 'Balance'}</span>
            <span className="stmt-num">{formatMMK(data.balance)}</span>
            <span className="stmt-num">—</span>
          </div>
        </div>
      </div>

      <h2 className="stmt-heading">
        {lang === 'my' ? 'ကဏ္ဍအလိုက် သုံးငွေ' : 'Spending by category'}
      </h2>
      {data.categories.length === 0 ? (
        <p className="stmt-empty">
          {lang === 'my' ? 'ဤကာလအတွင်း သုံးငွေ မရှိပါ' : 'No spending in this period'}
        </p>
      ) : (
        <div className="stmt-chart">
          <p className="stmt-chart-note">
            {lang === 'my'
              ? 'ကဏ္ဍ % = စုစုပေါင်းထွက်ငွေထဲမှ ဝေစု · ကဏ္ဍခွဲ % = မိခင်ကဏ္ဍထဲမှ ဝေစု'
              : 'Category % = share of total expense · Sub-category % = share of its parent category'}
          </p>
          <svg
            className="stmt-chart-svg"
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            role="img"
            aria-label={lang === 'my' ? 'ကဏ္ဍအလိုက် သုံးငွေ ဂရပ်ဖ်' : 'Spending by category chart'}
          >
            <line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="#cbd5e1" strokeWidth={1} />
            {chartColumns.map((col) => col.segments.map((seg) => (
              <g key={seg.key}>
                <rect x={seg.x} y={seg.y} width={chartColW} height={Math.max(seg.h, seg.total > 0 ? 1 : 0)} fill={seg.color} />
                {seg.label === 'full' && (
                  <>
                    <text x={seg.x + chartColW / 2} y={seg.y + seg.h / 2 - 3} textAnchor="middle" className="stmt-chart-seg-text">
                      {truncateChartLabel(seg.name, Math.max(4, Math.floor(chartColW / 5.5)))}
                    </text>
                    <text x={seg.x + chartColW / 2} y={seg.y + seg.h / 2 + 11} textAnchor="middle" className="stmt-chart-seg-text">
                      {truncateChartLabel(formatLakhs(seg.total, lang), Math.max(4, Math.floor(chartColW / 5.5)))}
                    </text>
                  </>
                )}
                {seg.label === 'pct' && (
                  <text x={seg.x + chartColW / 2} y={seg.y + seg.h / 2 + 4} textAnchor="middle" className="stmt-chart-seg-text">
                    {pct(seg.percent)}
                  </text>
                )}
                {seg.label === 'num' && seg.legendNo !== null && (
                  <text x={seg.x + chartColW / 2} y={seg.y + seg.h / 2 + 4} textAnchor="middle" className="stmt-chart-seg-text">
                    {seg.legendNo}
                  </text>
                )}
              </g>
            )))}
          </svg>
          <div className="stmt-chart-labels" style={{ gridTemplateColumns: `repeat(${chartColumns.length}, minmax(0, 1fr))` }}>
            {chartColumns.map((col) => (
              <div key={col.key} className="stmt-chart-label" title={col.name}>
                <div className="stmt-chart-label-name">{col.name}</div>
                <div className="stmt-chart-label-num">{formatMMK(col.total)} · {pct(col.percent)}</div>
              </div>
            ))}
          </div>
          {chartLegend.length > 0 && (
            <div className="stmt-chart-legend">
              {chartLegend.map((entry) => (
                <div key={entry.no} className="stmt-chart-legend-row">
                  <span className="stmt-chart-swatch" style={{ background: entry.color }} />
                  <span className="stmt-chart-legend-no">{entry.no}.</span>
                  <span className="stmt-chart-legend-name">{entry.name === entry.catName ? entry.name : `${entry.catName} · ${entry.name}`}</span>
                  <span className="stmt-num">{formatMMK(entry.total)}</span>
                  <span className="stmt-num">{pct(entry.percent)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <h2 className="stmt-heading">
        {lang === 'my' ? 'အသေးစိတ်စာရင်း' : 'Detailed records'}
      </h2>
      {groups.length === 0 ? (
        <p className="stmt-empty">
          {lang === 'my' ? 'ဤကာလအတွင်း မှတ်တမ်းမရှိပါ' : 'No records in this period'}
        </p>
      ) : (
        <table className="stmt-table">
          <thead>
            <tr>
              <th scope="col">{lang === 'my' ? 'ရက်စွဲ' : 'Date'}</th>
              <th scope="col">{lang === 'my' ? 'အကြောင်းအရာ' : 'Description'}</th>
              <th scope="col" className="stmt-num">
                {lang === 'my' ? 'ပမာဏ' : 'Amount'}
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={group.categoryName}>
                <tr className="stmt-group-row">
                  <th scope="row" colSpan={3}>
                    {group.categoryName}
                  </th>
                </tr>
                {group.subs.map((sub) => (
                  <React.Fragment key={sub.subName}>
                    <tr className="stmt-subhead-row">
                      <th scope="row" colSpan={3}>
                        ↳ {sub.subName}
                      </th>
                    </tr>
                    {sub.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="stmt-nowrap">{row.date ? formatShortDate(row.date) : '—'}</td>
                        <td>
                          {row.label}
                          {row.isSplit && (
                            <span className="stmt-split">
                              {' '}
                              ({lang === 'my' ? `ခွဲရေး ${row.splitCount} မျိုး` : `Split ×${row.splitCount}`})
                            </span>
                          )}
                        </td>
                        <td className={`stmt-num ${row.type === 'income' ? 'stmt-income' : 'stmt-expense'}`}>
                          {row.type === 'income' ? '+' : '−'}
                          {formatMMK(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
