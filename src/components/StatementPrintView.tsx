// [v7.6.27] Print-only statement view. This renders ONLY inside the
// #ngwe-print-root portal (mounted on demand by AnalyticsView when
// the user taps Print); on screen it is hidden by CSS in index.css,
// and in print the stylesheet hides everything else. Plain semantic
// tables so the browser paginates naturally: thead repeats, rows
// never split across pages (break-inside: avoid in print CSS).
import React from 'react';
import type { StatementData } from '../utils/statementData';
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

  // Group detail rows by date, preserving the date-ascending order.
  const groups: { date: string; rows: typeof data.details }[] = [];
  for (const row of data.details) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.date) last.rows.push(row);
    else groups.push({ date: row.date, rows: [row] });
  }

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

      <table className="stmt-table stmt-totals">
        <tbody>
          <tr>
            <th scope="row">{lang === 'my' ? 'ဝင်ငွေ' : 'Income'}</th>
            <td className="stmt-num stmt-income">+{formatMMK(data.income)}</td>
          </tr>
          <tr>
            <th scope="row">{lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}</th>
            <td className="stmt-num stmt-expense">−{formatMMK(data.expense)}</td>
          </tr>
          <tr>
            <th scope="row">{lang === 'my' ? 'လက်ကျန်' : 'Balance'}</th>
            <td className="stmt-num">{formatMMK(data.balance)}</td>
          </tr>
        </tbody>
      </table>

      <h2 className="stmt-heading">
        {lang === 'my' ? 'ကဏ္ဍအလိုက် သုံးငွေ' : 'Spending by category'}
      </h2>
      {data.categories.length === 0 ? (
        <p className="stmt-empty">
          {lang === 'my' ? 'ဤကာလအတွင်း သုံးငွေ မရှိပါ' : 'No spending in this period'}
        </p>
      ) : (
        <table className="stmt-table">
          <thead>
            <tr>
              <th scope="col">{lang === 'my' ? 'ကဏ္ဍ' : 'Category'}</th>
              <th scope="col" className="stmt-num">
                {lang === 'my' ? 'စုစုပေါင်း' : 'Total'}
              </th>
              <th scope="col" className="stmt-num">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((cat) => (
              <React.Fragment key={cat.categoryId}>
                <tr className="stmt-cat-row">
                  <th scope="row">{cat.name}</th>
                  <td className="stmt-num">{formatMMK(cat.total)}</td>
                  <td className="stmt-num">{pct(cat.percent)}</td>
                </tr>
                {cat.subs.map((sub) => (
                  <tr key={sub.subCategoryId || 'general'} className="stmt-sub-row">
                    <th scope="row">↳ {sub.name}</th>
                    <td className="stmt-num">{formatMMK(sub.total)}</td>
                    <td className="stmt-num">{pct(sub.percent)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
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
              <th scope="col">{lang === 'my' ? 'ကဏ္ဍ' : 'Category'}</th>
              <th scope="col" className="stmt-num">
                {lang === 'my' ? 'ပမာဏ' : 'Amount'}
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={group.date || 'nodate'}>
                <tr className="stmt-date-row">
                  <th scope="row" colSpan={4}>
                    {group.date ? formatDateDisplay(group.date, lang) : '—'}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="stmt-nowrap">{group.date ? formatShortDate(group.date) : '—'}</td>
                    <td>
                      {row.label}
                      {row.isSplit && (
                        <span className="stmt-split">
                          {' '}
                          ({lang === 'my' ? `ခွဲရေး ${row.splitCount} မျိုး` : `Split ×${row.splitCount}`})
                        </span>
                      )}
                    </td>
                    <td>
                      {row.categoryName}
                      {row.subName ? ` · ${row.subName}` : ''}
                    </td>
                    <td className={`stmt-num ${row.type === 'income' ? 'stmt-income' : 'stmt-expense'}`}>
                      {row.type === 'income' ? '+' : '−'}
                      {formatMMK(row.amount)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
