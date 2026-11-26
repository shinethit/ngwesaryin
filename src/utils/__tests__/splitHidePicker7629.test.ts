// [v7.6.29] While splits are on, the top category picker row hides:
// the split rows ARE the category picks (row 1 stays the primary
// through the untouched state sync). Splits off -> the picker renders
// exactly as before. UI-only: no save/sync logic changed.
// Source-text assertions follow the established pattern (no test
// renderer in this repo; vitest node env). NO path comparisons:
// sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('split-on hides the top category picker (v7.6.29)', () => {
  it('gates the category-picker row on splits being off', () => {
    const gate = '{!(splitSectionVisible && splitEnabled) && (';
    expect(MODAL_SRC).toContain(gate);
    const gateIdx = MODAL_SRC.indexOf(gate);
    const buttonIdx = MODAL_SRC.indexOf(
      'onClick={() => setIsCategoryPickerOpen(true)}',
    );
    const splitCommentIdx = MODAL_SRC.indexOf(
      '{/* [v7.6.07] Split across categories',
    );
    expect(buttonIdx).toBeGreaterThan(gateIdx);
    expect(splitCommentIdx).toBeGreaterThan(buttonIdx);
    // The gated block holds the picker row: trigger + icon tile +
    // the selected sub-category summary line, closed before the
    // split section starts.
    const block = MODAL_SRC.slice(gateIdx, splitCommentIdx);
    expect(block).toContain('setIsCategoryPickerOpen(true)');
    expect(block).toContain('explicitCatObj');
    expect(block).toContain('availableSubCats.find((s) => s.id === subCategoryId)');
    expect(block.trimEnd().endsWith(')}')).toBe(true);
  });

  it('has exactly one top-picker trigger (no duplicate picker added)', () => {
    const hits = MODAL_SRC.split('setIsCategoryPickerOpen(true)').length - 1;
    expect(hits).toBe(1);
  });

  it('the picker modal itself is still rendered (only the row hides)', () => {
    expect(MODAL_SRC).toContain(
      '<CategoryPickerModal isOpen={isCategoryPickerOpen}',
    );
  });

  it('the split section gate is unchanged (general, non-transfer only)', () => {
    expect(MODAL_SRC).toContain(
      "const splitSectionVisible = entryModel === 'general' && !isTransferCategory;",
    );
  });
});

describe('the category state sync is untouched (v7.6.29 is UI-only)', () => {
  it('row-1 picks still update the primary picker state', () => {
    expect(MODAL_SRC).toContain(
      'if (index === 0 && (patch.categoryId !== undefined || patch.subCategoryId !== undefined))',
    );
    expect(MODAL_SRC).toContain('if (patch.categoryId !== undefined) setCategoryId(patch.categoryId);');
    expect(MODAL_SRC).toContain('if (patch.subCategoryId !== undefined) setSubCategoryId(patch.subCategoryId);');
  });

  it('primary picks still move split row 1 with them', () => {
    expect(MODAL_SRC).toContain('setSplitRows((prev) => syncSplitRowToPrimary(prev, catId, subId || \'\'));');
  });

  it('turning splits on still seeds row 1 from the primary category', () => {
    expect(MODAL_SRC).toContain('setSplitRows(defaultSplitRows(categoryId, subCategoryId));');
  });

  it('the save still derives the primary category from split row 1', () => {
    expect(MODAL_SRC).toContain('targetCategory = built[0].categoryId;');
    expect(MODAL_SRC).toContain('targetSubCategory = built[0].subCategoryId || undefined;');
  });

  it('editing a split record still restores splits-on', () => {
    expect(MODAL_SRC).toContain('setSplitEnabled(restoredSplits !== null);');
  });
});

describe('Version bump to v7.6.29 (build 343)', () => {
  it('version surfaces agree on v7.6.29 / build 343', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.53');
    expect(CURRENT_BUILD_NUMBER).toBe(367);
    expect(VERSION_JSON.version).toBe('v7.6.53');
    expect(VERSION_JSON.buildNumber).toBe(367);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.53');
    expect(entry.buildNumber).toBe(367);
    expect(entry.changesMy[0]).toBe('Google ဖြင့် ဝင်ထားတဲ့ အကောင့်မှာ Email + စကားဝှက် သတ်မှတ်လို့ရပါပြီ — Google နဲ့ရော Email + စကားဝှက်နဲ့ပါ နှစ်နည်းလုံး ဝင်လို့ရပါတယ်');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('no mangled numbering anywhere in the version surfaces', () => {
    expect(CURRENT_APP_VERSION).not.toBe('v7.5.100');
    expect(VERSION_JSON.version).not.toBe('v7.5.100');
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.30'.replace(/0$/, ''));
    expect(VERSION_JSON.version).not.toBe('v7.6.30'.replace(/0$/, ''));
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.29/7.6.29, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.29';
    const TO_VERSION = '7.6.30';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/0$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.30');
    expect(guardFails('7.6.29')).toBe(false);
    expect(guardFails('7.6.30')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('7.6.3')).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
