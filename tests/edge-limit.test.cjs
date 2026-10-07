const assert = require('node:assert/strict');
const { test } = require('node:test');
const { join } = require('node:path');
const compiled = (file) => require(join(process.env.SWADE_TEST_BUILD, file));
const { defaultCharacter, defaultSettings } = compiled('storage/defaults.js');
const { characterPointTotalsFor, edgeCount } = compiled('store/selectors.js');
const { replayPromotions } = compiled('store/promotions.js');
const { autoBackfillPromotion } = compiled('store/backfill.js');

function character() {
  const c = structuredClone(defaultCharacter);
  c.creationLocked = true;
  c.attributes = { agility: 'd6', smarts: 'd6', spirit: 'd6', strength: 'd6', vigor: 'd6' };
  c.customHindrances = [
    { id: 'h1', name: 'First', description: '', severity: 'major' },
    { id: 'h2', name: 'Second', description: '', severity: 'major' },
  ];
  return c;
}

function totals(c, settings = defaultSettings) {
  return characterPointTotalsFor(c, settings.freeSkillPoints, replayPromotions(c, settings).edgeSlots);
}

function fillSkillPool(c, extraPoints = 0) {
  c.customSkills = Array.from({ length: 6 + extraPoints }, (_, index) => ({
    id: `skill-${index}`, name: `Skill ${index}`, linkedAttribute: 'agility', die: index < 6 ? 'd6' : 'd4',
  }));
}

test('four hindrance points afford two extra edges without being counted twice', () => {
  const c = character();
  c.edges = [{ edgeId: 'novye-sily', count: 4 }];
  assert.equal(totals(c).edgeLimit, 4);
  assert.equal(totals(c).free, 0);
  c.edges[0].count = 5;
  assert.equal(totals(c).edgeLimit, 4);
  assert.equal(totals(c).free, -2);
  assert.ok(edgeCount(c) > totals(c).edgeLimit);
});

test('spending two shared points on attributes shrinks the edge limit by one', () => {
  const c = character();
  c.edges = [{ edgeId: 'novye-sily', count: 4 }];
  c.attributes.spirit = 'd8';
  assert.equal(totals(c).attrSpent, 6);
  assert.equal(totals(c).edgeLimit, 3);
  assert.equal(totals(c).free, -2);
  assert.equal(c.edges[0].count, 4, 'overspending never removes selected edges');
  c.attributes.spirit = 'd6';
  assert.equal(totals(c).edgeLimit, 4);
  assert.equal(totals(c).free, 0);
});

test('skill overspending reduces capacity and odd remaining points cannot buy an edge', () => {
  const c = character();
  fillSkillPool(c, 2);
  assert.equal(totals(c).skillSpent, 14);
  assert.equal(totals(c).edgeLimit, 3);
  assert.equal(totals(c).free, 2);
  fillSkillPool(c, 3);
  assert.equal(totals(c).edgeLimit, 2);
  assert.equal(totals(c).free, 1);
  const settings = { ...defaultSettings, freeSkillPoints: 3 };
  assert.equal(totals(c, settings).edgeLimit, 4);
  assert.equal(totals(c, settings).free, 4);
});

test('attribute and skill costs share the same hindrance pool', () => {
  const c = character();
  c.attributes.spirit = 'd8';
  fillSkillPool(c, 1);
  assert.equal(totals(c).edgeLimit, 2);
  assert.equal(totals(c).free, 1);
  c.customHindrances = [];
  assert.equal(totals(c).edgeLimit, 2);
  assert.equal(totals(c).free, -3);
});

test('promotion edge credits stack with funded slots and inactive credits stop counting', () => {
  const c = character();
  c.edges = [{ edgeId: 'novye-sily', count: 5 }];
  c.advancesUsed = 1;
  c.promotions.allocations['earned-1'] = [{ kind: 'edgeSlot', points: 2 }];
  assert.equal(totals(c).edgeLimit, 5);
  assert.equal(totals(c).free, 0);
  c.advancesUsed = 0;
  assert.equal(totals(c).edgeLimit, 4);
  assert.equal(totals(c).free, -2);
});

test('promoted attributes use no hindrance points and exempt edges use no slots', () => {
  const c = character();
  c.advancesUsed = 1;
  c.promotions.allocations['earned-1'] = [{ kind: 'attribute', attributeId: 'spirit', points: 2 }];
  c.edges = [{ edgeId: 'misticheskii-dar' }, { edgeId: 'novye-sily', count: 4 }];
  c.customEdges = [{ id: 'free', name: 'Connection', description: '', countsTowardLimit: false }];
  assert.equal(replayPromotions(c, defaultSettings).character.attributes.spirit, 'd8');
  assert.equal(totals(c).edgeLimit, 4);
  assert.equal(totals(c).free, 0);
  c.customEdges[0].countsTowardLimit = true;
  assert.equal(totals(c).free, -2);
});

test('backfill respects funded edges and covers only unaffordable extra slots', () => {
  const c = character();
  c.advancesUsed = 1;
  c.edges = [{ edgeId: 'novye-sily', count: 4 }];
  assert.equal(autoBackfillPromotion(c, defaultSettings, 'earned-1'), null);
  c.edges[0].count = 5;
  const proposal = autoBackfillPromotion(c, defaultSettings, 'earned-1');
  assert.deepEqual(proposal.promotions.allocations['earned-1'], [{ kind: 'edgeSlot', points: 2 }]);
  assert.equal(totals(proposal).edgeLimit, 5);
  assert.equal(totals(proposal).free, 0);
  assert.deepEqual(proposal.edges, c.edges);
});
