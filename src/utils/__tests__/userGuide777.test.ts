// [v7.5.77 GUIDE-REWRITE-7577] Regression: the User Guide must match the
// current app. Reads UserGuideModal.tsx as text and asserts the corrected
// strings are present and the stale/false strings are gone.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const GUIDE_SRC = readFileSync(
  new URL('../../components/UserGuideModal.tsx', import.meta.url),
  'utf8',
);

describe('User Guide v7.5.77 — matches the current app', () => {
  it('budget model is multi-category with an 80% warning (no 75%)', () => {
    expect(GUIDE_SRC).toContain('ကဏ္ဍ တစ်ခုထက်ပို၍ ရွေးနိုင်သည်');
    expect(GUIDE_SRC).toContain('၈၀% ရောက်ရှိ');
    expect(GUIDE_SRC).not.toContain('၇၅%');
    expect(GUIDE_SRC).not.toContain('ဘတ်ဂျက်နှင့် စာရင်းဇယား');
  });
  it('plan limits are stated (Guest 15 / Free 150 per month)', () => {
    expect(GUIDE_SRC).toContain('၁၅ ခု');
    expect(GUIDE_SRC).toContain('၁၅၀');
    expect(GUIDE_SRC).not.toContain('full functionality');
  });
  it('export is Premium-only and in the right places', () => {
    expect(GUIDE_SRC).toContain('Excel / CSV ထုတ်ယူမည်');
    expect(GUIDE_SRC).toContain('Premium အသုံးပြုသူများသာ');
  });
  it('features that do not exist are not claimed', () => {
    expect(GUIDE_SRC).not.toContain('စလစ်/ပြေစာ ပုံများ');
    expect(GUIDE_SRC).not.toContain('receipt images');
    expect(GUIDE_SRC).not.toContain('အတိုးနှုန်းများကို သတ်မှတ်နိုင်သည်');
    expect(GUIDE_SRC).not.toContain('optional interest');
  });
  it('button names match the real UI', () => {
    expect(GUIDE_SRC).toContain('+ ငွေဆပ်မည်');
    expect(GUIDE_SRC).not.toContain('+ ပြန်ဆပ်မည်');
    expect(GUIDE_SRC).toContain('အပြည့်အဝခွင့်ပြု');
    expect(GUIDE_SRC).toContain('လျှို့ဝှက်နံပါတ် ဖွင့်မည်');
    expect(GUIDE_SRC).toContain('ကိုယ်တိုင် Cloud Sync ပြုလုပ်မည်');
    expect(GUIDE_SRC).not.toContain('App Install ပြုလုပ်ရန်');
    expect(GUIDE_SRC).not.toContain('"PIN သော့" Menu');
    expect(GUIDE_SRC).not.toContain('"+ စာရင်းသစ်"');
    expect(GUIDE_SRC).not.toContain('1-Click Cloud Sync');
  });
  it('missing topics are now covered', () => {
    expect(GUIDE_SRC).toContain('ဈေးနှုန်း နှိုင်းယှဉ်ခြင်း (Compare Price)');
    expect(GUIDE_SRC).toContain('ကဏ္ဍနှင့် ကဏ္ဍခွဲများ စီမံခန့်ခွဲခြင်း');
    expect(GUIDE_SRC).toContain('ယာဉ်၊ ဆီစာရင်းနှင့် ထိန်းသိမ်းမှု');
    expect(GUIDE_SRC).toContain('ဆိုင်လိပ်စာ ရှာဖွေခြင်းနှင့် သိမ်းဆည်းခြင်း');
    expect(GUIDE_SRC).toContain('ပညာပေး ဆောင်းပါးများ ဖတ်ရှုခြင်း');
    expect(GUIDE_SRC).toContain('အကြံပြုချက် ပေးပို့ခြင်း');
  });
});
