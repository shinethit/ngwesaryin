// [v7.6.46] Part G — Dashboard Hero hide-balance eye, mirroring the
// Records card pattern exactly: LOCAL useState, independent per
// tab, same wording, same '••••' masking. All five Hero amounts
// mask; no amount leaks via title/tooltip/tap while hidden.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const DASH_SRC = readFileSync(
  new URL('../../components/Dashboard.tsx', import.meta.url),
  'utf8',
);
const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

describe('Dashboard Hero eye (v7.6.46 Part G)', () => {
  it('has its own local hidden state, default visible', () => {
    expect(DASH_SRC).toContain('const [heroBalanceHidden, setHeroBalanceHidden] = useState(false);');
  });

  it('the eye button uses the same MY+EN wording as the Records eye', () => {
    expect(DASH_SRC).toContain('လက်ကျန်ကို ဝှက်မည်');
    expect(DASH_SRC).toContain('လက်ကျန်ကို ပြမည်');
    expect(DASH_SRC).toContain('Hide balance');
    expect(DASH_SRC).toContain('Show balance');
    expect(DASH_SRC).toContain('setHeroBalanceHidden(!heroBalanceHidden)');
    expect(DASH_SRC).toContain('<EyeOff');
    expect(DASH_SRC).toContain('<Eye ');
  });

  it('the button is a 44px touch target in the card header', () => {
    expect(DASH_SRC).toContain('min-h-[44px] min-w-[44px]');
  });

  it('all five Hero amounts mask with dots when hidden', () => {
    // Big balance + shared line + income + expense + net.
    expect(DASH_SRC).toContain("heroBalanceHidden ? '••••' : formatLakhs(totalWalletBalance, lang)");
    expect(DASH_SRC).toContain("heroBalanceHidden ? '••••' : formatLakhs(sharedWalletBalance, lang)");
    expect(DASH_SRC).toContain("heroBalanceHidden ? '••••' : `+${formatLakhs(totalIncome, lang)}`");
    expect(DASH_SRC).toContain("heroBalanceHidden ? '••••' : `-${formatLakhs(totalExpense, lang)}`");
    expect(DASH_SRC).toContain('heroBalanceHidden ? \'••••\' :');
  });

  it('no amount leaks via title or tooltip while hidden', () => {
    // Income/expense/net titles are undefined when hidden.
    expect(DASH_SRC).toContain('title={heroBalanceHidden ? undefined : formatMMK(totalIncome)}');
    expect(DASH_SRC).toContain('title={heroBalanceHidden ? undefined : formatMMK(totalExpense)}');
    expect(DASH_SRC).toContain('title={heroBalanceHidden ? undefined : formatMMK(netSavings)}');
    // The big-balance title carries no amount while hidden.
    expect(DASH_SRC).toContain(
      "title={heroBalanceHidden ? (lang === 'my' ? 'ငွေကြေး အလိုက် ကြည့်ရန် နှိပ်ပါ' : 'Tap for currency breakdown')",
    );
  });

  it('the currency-breakdown tap does nothing while hidden', () => {
    expect(DASH_SRC).toContain('if (!heroBalanceHidden) setShowCurrencyBreakdown(true)');
  });

  it('the state is independent: Records keeps its own eye state', () => {
    expect(TX_SRC).toContain('balanceHidden');
    expect(DASH_SRC).not.toContain('balanceHidden, setBalanceHidden');
    expect(DASH_SRC).not.toContain('heroBalanceHidden, setHeroBalanceHidden} = useBalanceHidden');
  });
});
