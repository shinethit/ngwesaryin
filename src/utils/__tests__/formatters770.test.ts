// [v7.5.70] Regression: built-in debt pseudo-categories must resolve to
// real display names. The trend chart legend used `cat?.name || catId`,
// which showed the raw key "cat_debt_issued" because debt categories are
// not in the user category list — the helper's built-in map is the fix.
import { describe, it, expect } from 'vitest';
import { getCategoryDisplayName } from '../formatters';

describe('getCategoryDisplayName — debt pseudo-categories (v7.5.70)', () => {
  it('resolves cat_debt_issued in Myanmar', () => {
    expect(getCategoryDisplayName('cat_debt_issued', [], 'my')).toBe('ချေးငွေ ထုတ်ပေးခြင်း');
  });

  it('resolves cat_debt_issued in English', () => {
    expect(getCategoryDisplayName('cat_debt_issued', [], 'en')).toBe('Debt Issued');
  });

  it('resolves cat_debt_received in Myanmar', () => {
    expect(getCategoryDisplayName('cat_debt_received', [], 'my')).toBe('ချေးငွေ ရယူခြင်း');
  });

  it('prefers a real category from the list over the built-in map', () => {
    const cats = [{ id: 'cat_debt_issued', name: 'ကိုယ်ပိုင်အမည်', nameEn: 'Custom Name' }];
    expect(getCategoryDisplayName('cat_debt_issued', cats, 'my')).toBe('ကိုယ်ပိုင်အမည်');
    expect(getCategoryDisplayName('cat_debt_issued', cats, 'en')).toBe('Custom Name');
  });

  it('never returns a raw cat_ key for an unknown id', () => {
    expect(getCategoryDisplayName('cat_mystery_xyz', [], 'my')).not.toContain('cat_');
  });
});
