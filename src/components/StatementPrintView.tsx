// [v7.6.27] Print-only statement view. This renders ONLY inside the
// #ngwe-print-root portal (mounted on demand by AnalyticsView when
// the user taps Print) or inside the #ngwe-preview-root overlay (the
// iOS standalone fallback, v7.6.36); on screen it is hidden by CSS
// in index.css, and in print the stylesheet hides everything else.
// Plain semantic markup so the browser paginates naturally: thead
// repeats, rows never split across pages (break-inside: avoid in
// print CSS). [v7.6.36] The totals table is now a donut chart
// (income vs expense slices; the balance is the centre label, never
// a slice) and the category table is a horizontal bar chart; the
// detail list is grouped category → sub-category → records.
import React from 'react';
import type { StatementData } from '../utils/statementData';
import {
  flowShares,
  groupStatementDetails,
  percentOf,
} from '../utils/statementData';
import { formatMMK, formatDateDisplay, formatShortDate } from '../utils/formatters';

interface StatementPrintViewProps {
  data: StatementData;
  lang: 'my' | 'en';
  /** Wallet-scope line, e.g. included-wallets count (AnalyticsView). */
  walletScopeLabel: string;
}

function pct(percent: number | null): string {
  return percent === null ? '—' : `${percent}%`;
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
        <div className="stmt-bars">
          <p className="stmt-bars-note">
            {lang === 'my'
              ? 'ကဏ္ဍ % = စုစုပေါင်းထွက်ငွေထဲမှ ဝေစု · ကဏ္ဍခွဲ % = မိခင်ကဏ္ဍထဲမှ ဝေစု'
              : 'Category % = share of total expense · Sub-category % = share of its parent category'}
          </p>
          {data.categories.map((cat) => (
            <div key={cat.categoryId} className="stmt-bar-group">
              <div className="stmt-bar-row">
                <div className="stmt-bar-head">
                  <span className="stmt-bar-name">{cat.name}</span>
                  <span className="stmt-num">{formatMMK(cat.total)}</span>
                  <span className="stmt-num">{pct(cat.percent)}</span>
                </div>
                <div className="stmt-bar-track">
                  <div
                    className="stmt-bar-fill"
                    style={{ width: `${cat.percent ?? 0}%` }}
                  />
                </div>
              </div>
              {cat.subs.map((sub) => (
                <div key={sub.subCategoryId || 'general'} className="stmt-bar-row stmt-bar-sub">
                  <div className="stmt-bar-head">
                    <span className="stmt-bar-name">↳ {sub.name}</span>
                    <span className="stmt-num">{formatMMK(sub.total)}</span>
                    <span className="stmt-num">{pct(sub.percent)}</span>
                  </div>
                  <div className="stmt-bar-track">
                    <div
                      className="stmt-bar-fill stmt-bar-fill-sub"
                      style={{ width: `${sub.percent ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
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
