const assert = require('node:assert/strict');
const { test } = require('node:test');
const { join } = require('node:path');
const compiled = (file) => require(join(process.env.SWADE_TEST_BUILD, file));
const { autoBackfillPromotion } = compiled('store/backfill.js');
const { replayPromotions } = compiled('store/promotions.js');
const { characterPointTotalsFor, edgeCap, edgeCount } = compiled('store/selectors.js');
const { defaultCharacter, defaultSettings } = compiled('storage/defaults.js');

// Mock existing characters: their current dice were recorded directly as creation values.
function mockCharacter() {
  const c = structuredClone(defaultCharacter);
  c.creationLocked = true;
  c.advancesUsed = 2;
  c.promotions.legacyBaseline = true;
  // Fill the normal creation skill allowance; upgraded dice then create overspending.
  c.customSkills = Array.from({ length: 12 }, (_, index) => ({
    id: `base-skill-${index}`, name: `Base skill ${index}`, linkedAttribute: 'agility', die: 'd4',
  }));
  return c;
}

function backfillSafely(c, key = 'earned-1', settings = defaultSettings) {
  const snapshot = structuredClone(c);
  const before = replayPromotions(c, settings);
  const candidate = autoBackfillPromotion(c, settings, key);
  assert.ok(candidate);
  assert.deepEqual(c, snapshot, 'backfilling only proposes a draft; the original character is untouched');
  const after = replayPromotions(candidate, settings);
  assert.deepEqual(after.character.attributes, before.character.attributes);
  assert.deepEqual(after.character.skills, before.character.skills);
  assert.deepEqual(after.character.customSkills, before.character.customSkills);
  assert.deepEqual(after.character.edges, before.character.edges);
  assert.deepEqual(after.character.customEdges, before.character.customEdges);
  assert.equal(after.character.advancesUsed, before.character.advancesUsed);
  assert.equal(after.rows.find((row) => row.key === key).status, 'applied');
  const beforeTotals = characterPointTotalsFor(c, settings.freeSkillPoints, before.edgeSlots);
  const afterTotals = characterPointTotalsFor(candidate, settings.freeSkillPoints, after.edgeSlots);
  assert.ok(beforeTotals.free < 0, 'only an over-budget character needs backfilling');
  assert.ok(afterTotals.free > beforeTotals.free, 'each backfill must reduce overspending');
  for (const row of before.rows.filter((row) => row.key !== key)) {
    assert.equal(after.rows.find((item) => item.key === row.key).status, row.status);
    assert.deepEqual(candidate.promotions.allocations[row.key], c.promotions.allocations[row.key]);
  }
  return candidate;
}

test('backfill prioritizes excess counted edges, without lowering any dice', () => {
  const c = mockCharacter();
  c.edges = [{ edgeId: 'novye-sily', count: 3 }, { edgeId: 'misticheskii-dar' }];
  c.customEdges = [{ id: 'free', name: 'Free connection', description: '', countsTowardLimit: false }];
  for (const id of Object.keys(c.attributes)) c.attributes[id] = 'd8';
  const result = backfillSafely(c);
  assert.deepEqual(result.promotions.allocations['earned-1'], [{ kind: 'edgeSlot', points: 2 }]);
  assert.equal(edgeCount(result), edgeCap(replayPromotions(result, defaultSettings).edgeSlots));
  assert.deepEqual(result.attributes, c.attributes);
  // The next field sees the increased limit and moves on to attributes.
  const next = backfillSafely(result, 'earned-2');
  assert.equal(next.promotions.allocations['earned-2'][0].kind, 'attribute');
});

test('backfill transfers one attribute step when creation attributes exceed five points', () => {
  const c = mockCharacter();
  for (const id of Object.keys(c.attributes)) c.attributes[id] = 'd8';
  c.skills.atletika = 'd6';
  const result = backfillSafely(c);
  const allocation = result.promotions.allocations['earned-1'][0];
  assert.equal(allocation.kind, 'attribute');
  assert.equal(result.attributes[allocation.attributeId], 'd6');
});

test('backfill transfers two eligible skills above d4, spending one point on each', () => {
  const c = mockCharacter();
  c.attributes.agility = 'd8';
  c.attributes.smarts = 'd8';
  c.skills.atletika = 'd6';
  c.skills.vnimanie = 'd6';
  const result = backfillSafely(c);
  assert.deepEqual(result.promotions.allocations['earned-1'], [
    { kind: 'skill', skillId: 'atletika', points: 1 },
    { kind: 'skill', skillId: 'vnimanie', points: 1 },
  ]);
  assert.equal(result.skills.atletika, 'd4');
  assert.equal(result.skills.vnimanie, 'd4');
});

test('single-skill fallback prioritizes skills exceeding their linked attribute', () => {
  const c = mockCharacter();
  c.attributes.smarts = 'd8';
  c.skills.atletika = 'd8';
  c.skills.vnimanie = 'd8';
  const result = backfillSafely(c);
  assert.deepEqual(result.promotions.allocations['earned-1'], [{ kind: 'skill', skillId: 'atletika', points: 2 }]);
  assert.equal(result.skills.atletika, 'd6');
  assert.equal(result.skills.vnimanie, 'd8');
});

test('single-skill fallback can transfer two cheap die steps for two points', () => {
  const c = mockCharacter();
  c.attributes.agility = 'd8';
  c.skills.atletika = 'd8';
  const result = backfillSafely(c);
  assert.deepEqual(result.promotions.allocations['earned-1'], [{ kind: 'skill', skillId: 'atletika', points: 2 }]);
  assert.equal(result.skills.atletika, 'd4');
});

test('custom skills participate in split and single-skill backfills', () => {
  const c = mockCharacter();
  c.attributes.agility = 'd8';
  c.skills.atletika = 'd6';
  c.customSkills.push({ id: 'craft', name: 'Craft', linkedAttribute: 'agility', die: 'd6' });
  const split = backfillSafely(c);
  assert.equal(split.customSkills.find((skill) => skill.id === 'craft').die, 'd4');
  assert.ok(split.promotions.allocations['earned-1'].some((item) => item.skillId === 'craft' && item.points === 1));
  c.attributes.agility = 'd4';
  c.skills.atletika = 'd4';
  const single = backfillSafely(c);
  assert.deepEqual(single.promotions.allocations['earned-1'], [{ kind: 'skill', skillId: 'craft', points: 2 }]);
});

test('backfill skips attribute choices that would invalidate an earlier split promotion', () => {
  const c = mockCharacter();
  c.attributes = { agility: 'd8', smarts: 'd6', spirit: 'd6', strength: 'd6', vigor: 'd6' };
  c.skills.atletika = 'd6';
  c.promotions.allocations['earned-1'] = [
    { kind: 'skill', skillId: 'atletika', points: 1 },
    { kind: 'skill', skillId: 'vnimanie', points: 1 },
  ];
  const result = backfillSafely(c, 'earned-2');
  assert.equal(result.attributes.agility, 'd8');
  assert.equal(result.attributes.smarts, 'd6');
  assert.equal(result.promotions.allocations['earned-2'][0].attributeId, 'spirit');
});

test('backfill preserves later skill investments and can fill fields out of order', () => {
  const c = mockCharacter();
  c.skills.atletika = 'd8';
  c.promotions.allocations['earned-2'] = [{ kind: 'skill', skillId: 'atletika', points: 2 }];
  const result = backfillSafely(c);
  assert.equal(replayPromotions(result, defaultSettings).character.skills.atletika, 'd10');
  assert.equal(result.skills.atletika, 'd6');
});

test('backfill leaves filled, inactive, and impossible promotions untouched', () => {
  const c = mockCharacter();
  const snapshot = structuredClone(c);
  assert.equal(autoBackfillPromotion(c, defaultSettings, 'earned-1'), null);
  assert.deepEqual(c, snapshot);
  c.skills.atletika = 'd6';
  c.promotions.allocations['earned-1'] = [{ kind: 'edgeSlot', points: 2 }];
  assert.equal(autoBackfillPromotion(c, defaultSettings, 'earned-1'), null);
  assert.equal(autoBackfillPromotion(c, defaultSettings, 'earned-3'), null);
  // A lone d6 below its attribute cannot account for a full two-point promotion.
  c.promotions.allocations = {};
  c.attributes.agility = 'd8';
  assert.equal(autoBackfillPromotion(c, defaultSettings, 'earned-1'), null);
});

test('bonus backfills increase capacity without increasing the promotion count', () => {
  const c = mockCharacter();
  c.advancesUsed = 4;
  c.edges = [{ edgeId: 'novye-sily', count: 3 }];
  const settings = { ...defaultSettings, doubleEveryFourthPromotion: true };
  const result = backfillSafely(c, 'earned-4-bonus', settings);
  assert.equal(replayPromotions(result, settings).character.advancesUsed, 4);
  assert.equal(autoBackfillPromotion(c, { ...defaultSettings, doubleEveryFourthPromotion: false }, 'earned-4-bonus'), null);
});

test('valid creation budgets never backfill raised skills or attributes, including hindrance-funded values', () => {
  for (const funded of [false, true]) {
    const c = mockCharacter();
    c.customSkills = [];
    c.attributes.agility = 'd8';
    c.skills.atletika = 'd8';
    c.skills.vnimanie = 'd6';
    if (funded) {
      c.attributes = { agility: 'd8', smarts: 'd6', spirit: 'd6', strength: 'd6', vigor: 'd6' };
      c.customHindrances = [{ id: 'funding', name: 'Funding', description: '', severity: 'major' }];
    }
    assert.equal(characterPointTotalsFor(c).free, 0);
    const snapshot = structuredClone(c);
    assert.equal(autoBackfillPromotion(c, defaultSettings, 'earned-1'), null);
    assert.deepEqual(c, snapshot);
  }
});

test('backfilling stops once earlier drafts have resolved the inconsistency', () => {
  const c = mockCharacter();
  c.attributes.agility = 'd6';
  c.attributes.smarts = 'd6';
  c.skills.atletika = 'd6';
  c.skills.vnimanie = 'd6';
  const proposal = backfillSafely(c);
  assert.equal(characterPointTotalsFor(proposal).free, 0);
  assert.equal(autoBackfillPromotion(proposal, defaultSettings, 'earned-2'), null);
});

test('attribute backfills must improve the budget after recalculating linked skill costs', () => {
  const c = mockCharacter();
  c.attributes = { agility: 'd8', smarts: 'd12', spirit: 'd4', strength: 'd4', vigor: 'd4' };
  c.customSkills = [
    { id: 'first', name: 'First', linkedAttribute: 'smarts', die: 'd12' },
    { id: 'second', name: 'Second', linkedAttribute: 'smarts', die: 'd12' },
  ];
  c.skills.atletika = 'd8';
  c.skills.vnimanie = 'd10';
  c.skills.osvedomlionnost = 'd10';
  c.skills.skrytnost = 'd8';
  c.skills.ubezhdenie = 'd6';
  const proposal = backfillSafely(c);
  assert.notEqual(proposal.promotions.allocations['earned-1'][0].kind, 'attribute');
});

test('625 mocked dice combinations preserve current values and other promotion validity', () => {
  const dice = ['d4', 'd6', 'd8', 'd10', 'd12'];
  let accepted = 0;
  let rejected = 0;
  for (const agility of dice) for (const smarts of dice) {
    for (const athletics of dice) for (const notice of dice) {
      const c = mockCharacter();
      c.advancesUsed = 3;
      c.attributes.agility = agility;
      c.attributes.smarts = smarts;
      c.skills.atletika = athletics;
      c.skills.vnimanie = notice;
      c.promotions.allocations = {
        'earned-1': [{ kind: 'skill', skillId: 'atletika', points: 2 }],
        'earned-3': [{ kind: 'skill', skillId: 'vnimanie', points: 2 }],
      };
      const before = structuredClone(c);
      const proposal = autoBackfillPromotion(c, defaultSettings, 'earned-2');
      assert.deepEqual(c, before);
      if (proposal) {
        accepted++;
        backfillSafely(c, 'earned-2');
      } else rejected++;
    }
  }
  assert.ok(accepted > 0);
  assert.ok(rejected > 0);
});
