const assert = require('node:assert/strict');
const { test } = require('node:test');
const { join } = require('node:path');
const compiled = (file) => require(join(process.env.SWADE_TEST_BUILD, file));
const { replayPromotions, promotionRows, VETERAN_EDGE_ID, promotionCount, edgeRequirementWarnings } = compiled('store/promotions.js');
const { defaultCharacter, defaultSettings } = compiled('storage/defaults.js');
const { characterPointTotals, edgeCap, edgeCount } = compiled('store/selectors.js');
const { BASE_SKILL_IDS, HINDRANCE_BY_ID, SKILL_BY_ID } = compiled('data/index.js');
const { exportCharacterJson, importCharacterJson, loadCharacter, saveCharacter } = compiled('storage/persist.js');

const ridingId = [...SKILL_BY_ID.values()].find((skill) => /Верховая/i.test(skill.ru)).id;
const ridingAttribute = SKILL_BY_ID.get(ridingId).linkedAttribute;
const upgrade = (skillId, points = 2) => ({ kind: 'skill', skillId, points });
const learn = (skillId) => ({ kind: 'learnSkill', skillId, points: 2 });
const attribute = (attributeId) => ({ kind: 'attribute', attributeId, points: 2 });
const character = () => structuredClone(defaultCharacter);
function progressed(allocations, earned = 1) {
  const c = character();
  c.advancesUsed = earned;
  c.promotions.allocations = allocations;
  return c;
}

test('creation corrections replay point investments without changing the baseline', () => {
  const c = progressed({ 'earned-1': [upgrade(ridingId)] });
  c.attributes[ridingAttribute] = 'd12';
  c.skills[ridingId] = 'd4';
  assert.equal(replayPromotions(c, defaultSettings).character.skills[ridingId], 'd8');
  assert.equal(c.skills[ridingId], 'd4');
  c.skills[ridingId] = 'd6';
  assert.equal(replayPromotions(c, defaultSettings).character.skills[ridingId], 'd10');
  delete c.skills[ridingId];
  const invalid = replayPromotions(c, defaultSettings);
  assert.equal(invalid.rows[0].status, 'invalid');
  assert.equal(invalid.character.skills[ridingId], undefined);
  assert.deepEqual(c.promotions.allocations['earned-1'], [upgrade(ridingId)]);
});

test('a new skill costs an entire promotion and upgrades require it to exist', () => {
  const c = progressed({ 'earned-1': [learn(ridingId)], 'earned-2': [upgrade(ridingId)] }, 2);
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.character.skills[ridingId], 'd6');
  assert.deepEqual(result.rows.map((row) => row.status), ['applied', 'applied']);
  c.promotions.allocations['earned-1'] = [];
  assert.deepEqual(replayPromotions(c, defaultSettings).rows.map((row) => row.status), ['empty', 'invalid']);
  c.promotions.allocations['earned-1'] = [learn(ridingId)];
  assert.equal(replayPromotions(c, defaultSettings).rows[1].status, 'applied');
});

test('linked-attribute costs recalculate and an allocation must spend all its points', () => {
  const c = progressed({ 'earned-1': [upgrade(ridingId)] });
  c.skills[ridingId] = 'd4';
  c.attributes[ridingAttribute] = 'd4';
  assert.equal(replayPromotions(c, defaultSettings).character.skills[ridingId], 'd6');
  c.attributes[ridingAttribute] = 'd6';
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'invalid');
  assert.equal(result.character.skills[ridingId], 'd4');
});

test('split allocations apply atomically and invalid rows do not block later rows', () => {
  const c = progressed({ 'earned-1': [upgrade('atletika', 1), upgrade(ridingId, 1)], 'earned-2': [attribute('spirit')] }, 2);
  c.attributes.agility = 'd8';
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'invalid');
  assert.equal(result.character.skills.atletika, 'd4');
  assert.equal(result.character.attributes.spirit, 'd6');
  c.skills[ridingId] = 'd4';
  c.attributes[ridingAttribute] = 'd8';
  const fixed = replayPromotions(c, defaultSettings);
  assert.equal(fixed.rows[0].status, 'applied');
  assert.equal(fixed.character.skills.atletika, 'd6');
  assert.equal(fixed.character.skills[ridingId], 'd6');
});

test('d12 and incomplete allocations invalidate the whole row', () => {
  const c = progressed({ 'earned-1': [upgrade(ridingId, 1), upgrade('atletika', 1)] });
  c.attributes.agility = 'd12';
  c.skills[ridingId] = 'd12';
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'invalid');
  assert.equal(result.character.skills.atletika, 'd4');
  c.promotions.allocations['earned-1'] = [upgrade('atletika', 1)];
  assert.equal(replayPromotions(c, defaultSettings).rows[0].status, 'invalid');
});

test('fourth-promotion bonus changes effects without changing count or erasing choices', () => {
  const c = progressed({ 'earned-4-bonus': [attribute('spirit')] }, 5);
  const enabled = { ...defaultSettings, doubleEveryFourthPromotion: true };
  const on = replayPromotions(c, enabled);
  assert.equal(on.rows.filter((row) => row.active).length, 6);
  assert.equal(on.character.attributes.spirit, 'd6');
  assert.equal(on.character.advancesUsed, 5);
  const off = replayPromotions(c, defaultSettings);
  assert.equal(off.character.attributes.spirit, 'd4');
  assert.equal(off.rows.find((row) => row.origin === 'bonus').status, 'inactive');
  assert.equal(replayPromotions(c, enabled).character.attributes.spirit, 'd6');
});

test('veteran grants four ordinary starting fields with first bonus at total eight', () => {
  const c = progressed({ 'veteran-4': [attribute('spirit')], 'earned-4-bonus': [attribute('vigor')] }, 4);
  c.edges.push({ edgeId: VETERAN_EDGE_ID });
  const enabled = { ...defaultSettings, doubleEveryFourthPromotion: true };
  const result = replayPromotions(c, enabled);
  assert.equal(result.character.advancesUsed, 8);
  assert.equal(result.rows.filter((row) => row.origin === 'veteran').length, 4);
  assert.deepEqual(result.rows.filter((row) => row.origin === 'bonus').map((row) => row.number), [8]);
  assert.equal(result.character.attributes.spirit, 'd6');
  c.edges = [];
  const removed = replayPromotions(c, enabled);
  assert.equal(removed.character.advancesUsed, 4);
  assert.equal(removed.character.attributes.spirit, 'd4');
  assert.equal(removed.rows.find((row) => row.key === 'veteran-4').status, 'inactive');
  c.edges.push({ edgeId: VETERAN_EDGE_ID });
  assert.equal(replayPromotions(c, enabled).character.attributes.spirit, 'd6');
});

test('reducing the earned count keeps later allocations inactive and restores them', () => {
  const c = progressed({ 'earned-2': [attribute('strength')] }, 2);
  c.advancesUsed = 1;
  assert.equal(replayPromotions(c, defaultSettings).character.attributes.strength, 'd4');
  assert.equal(replayPromotions(c, defaultSettings).rows[1].status, 'inactive');
  c.advancesUsed = 2;
  assert.equal(replayPromotions(c, defaultSettings).character.attributes.strength, 'd6');
});

test('frequency and prerequisite warnings do not prevent valid promotions', () => {
  const c = progressed({ 'earned-1': [attribute('spirit')], 'earned-2': [attribute('vigor')], 'earned-3': [{ kind: 'edge', edgeId: 'novye-sily', points: 2 }] }, 3);
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[1].status, 'applied');
  assert.ok(result.rows[1].warnings.length > 0);
  assert.equal(result.rows[2].status, 'applied');
  assert.ok(result.rows[2].warnings.length > 0);
});

test('custom skills can be learned and upgraded; missing earlier learning invalidates upgrades', () => {
  const customSkill = { id: 'custom-riding', name: 'Custom riding', linkedAttribute: 'agility' };
  const c = progressed({ 'earned-1': [{ kind: 'learnSkill', skillId: customSkill.id, points: 2, customSkill }], 'earned-2': [upgrade(customSkill.id)] }, 2);
  assert.equal(replayPromotions(c, defaultSettings).character.customSkills[0].die, 'd6');
  c.promotions.allocations['earned-1'] = [];
  assert.equal(replayPromotions(c, defaultSettings).rows[1].status, 'invalid');
});

test('repeatable edges count copies and veteran cannot be acquired through promotions', () => {
  const c = progressed({ 'earned-1': [{ kind: 'edge', edgeId: 'novye-sily', points: 2 }] });
  c.edges.push({ edgeId: 'novye-sily' });
  assert.equal(replayPromotions(c, defaultSettings).character.edges[0].count, 2);
  c.promotions.allocations['earned-1'] = [{ kind: 'edge', edgeId: VETERAN_EDGE_ID, points: 2 }];
  assert.equal(replayPromotions(c, defaultSettings).rows[0].status, 'invalid');
});

test('creation pool excludes promotions and custom edges but charges repeated ordinary edges', () => {
  const c = progressed({ 'earned-1': [attribute('strength')] }, 100);
  const totals = () => characterPointTotals({ c, baseSkillIds: BASE_SKILL_IDS, linkedAttrFor: (id) => SKILL_BY_ID.get(id)?.linkedAttribute, hindranceMap: HINDRANCE_BY_ID });
  assert.equal(totals().free, 0);
  c.customEdges.push({ id: 'custom1', name: 'one', description: '' }, { id: 'custom2', name: 'two', description: '' }, { id: 'custom3', name: 'three', description: '' });
  assert.equal(totals().free, 0);
  c.edges.push({ edgeId: 'novye-sily', count: 3 });
  assert.equal(totals().free, -2);
});

test('a freely granted custom edge can consume a promotion without being duplicated', () => {
  const edge = { id: 'connection', name: 'Useful connection', description: 'An ally granted by the GM' };
  const c = progressed({ 'earned-1': [{ kind: 'customEdge', edge, points: 2 }] });
  c.customEdges.push(edge);
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'applied');
  assert.deepEqual(result.character.customEdges, [edge]);
  assert.deepEqual(c.customEdges, [edge]);
  c.advancesUsed = 0;
  assert.deepEqual(replayPromotions(c, defaultSettings).character.customEdges, [edge]);
});

test('custom edges can still be acquired through promotions and cannot consume two promotions', () => {
  const edge = { id: 'connection', name: 'Useful connection', description: '' };
  const allocation = { kind: 'customEdge', edge, points: 2 };
  const c = progressed({ 'earned-1': [allocation], 'earned-2': [allocation] }, 2);
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'applied');
  assert.equal(result.rows[1].status, 'invalid');
  assert.deepEqual(result.character.customEdges, [edge]);
  assert.deepEqual(c.customEdges, []);
});

test('export/import preserves baseline, lock, inactive allocations and settings', () => {
  const c = progressed({ 'earned-1': [learn(ridingId)], 'earned-4-bonus': [attribute('spirit')] });
  c.creationLocked = true;
  c.money = 42;
  c.wounds = 2;
  c.powerPoints = 7;
  const settings = { ...defaultSettings, doubleEveryFourthPromotion: true };
  const imported = importCharacterJson(exportCharacterJson(c, settings, null));
  assert.deepEqual(imported.character, c);
  assert.deepEqual(imported.settings, settings);
  const result = replayPromotions(imported.character, imported.settings).character;
  assert.equal(result.money, 42);
  assert.equal(result.wounds, 2);
  assert.equal(result.powerPoints, 7);
});

test('legacy imports preserve current stats and total promotion count', () => {
  const c = character();
  delete c.promotions;
  delete c.creationLocked;
  c.advancesUsed = 5;
  c.skills[ridingId] = 'd8';
  const imported = importCharacterJson(JSON.stringify({ schemaVersion: 1, character: c }));
  assert.equal(imported.character.promotions.legacyBaseline, true);
  assert.deepEqual(imported.character.promotions.allocations, {});
  assert.equal(replayPromotions(imported.character, imported.settings).character.skills[ridingId], 'd8');
  assert.equal(imported.character.advancesUsed, 5);
  c.edges.push({ edgeId: VETERAN_EDGE_ID });
  const veteran = importCharacterJson(JSON.stringify({ character: c }));
  assert.equal(veteran.character.advancesUsed, 1);
  assert.equal(replayPromotions(veteran.character, veteran.settings).character.advancesUsed, 5);
});

test('local storage migrates old characters once and persists allocations', () => {
  const storage = new Map();
  global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const c = character();
  delete c.promotions;
  delete c.creationLocked;
  c.advancesUsed = 5;
  storage.set('swade:character', JSON.stringify(c));
  storage.set('swade:schemaVersion', '1');
  const loaded = loadCharacter();
  assert.equal(storage.get('swade:schemaVersion'), '4');
  loaded.promotions.allocations['earned-1'] = [attribute('strength')];
  saveCharacter(loaded);
  assert.deepEqual(loadCharacter(), loaded);
});

test('published version 2 promotion saves keep their lock, earned count and allocations', () => {
  const c = progressed({ 'earned-1': [attribute('agility')], 'veteran-1': [learn(ridingId)] }, 1);
  c.creationLocked = true;
  c.edges.push({ edgeId: VETERAN_EDGE_ID });
  const imported = importCharacterJson(JSON.stringify({ schemaVersion: 2, character: c }));
  assert.deepEqual(imported.character, c);
  assert.equal(replayPromotions(imported.character, imported.settings).character.advancesUsed, 5);
});

test('version 2 custom-power saves migrate promotions without losing powers or pins', () => {
  const c = character();
  delete c.promotions;
  delete c.creationLocked;
  c.advancesUsed = 5;
  c.edges.push({ edgeId: VETERAN_EDGE_ID });
  c.powers = [{ powerId: 'strela' }];
  c.customPowers = [{ id: 'custom-power', name: 'Flame', powerPoints: '2', range: 'Self', duration: '5' }];
  c.pinnedPowerIds = ['strela', 'custom-power'];
  const imported = importCharacterJson(JSON.stringify({ schemaVersion: 2, character: c }));
  assert.equal(imported.character.advancesUsed, 1);
  assert.equal(imported.character.promotions.legacyBaseline, true);
  assert.deepEqual(imported.character.customPowers, c.customPowers);
  assert.deepEqual(imported.character.pinnedPowerIds, c.pinnedPowerIds);
  assert.deepEqual(replayPromotions(imported.character, imported.settings).character.customPowers, c.customPowers);
});

test('custom powers survive local-storage upgrades, filter changes and reloads', () => {
  const power = {
    id: 'custom-power-flame', name: 'Flame', powerPoints: '2', range: 'Self',
    duration: '5', attackEffect: '2d6', shortDescription: 'Custom effect',
    fullDescription: 'Homebrew power description',
  };
  for (const version of [2, 3, 4]) {
    const storage = new Map();
    global.localStorage = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    };
    const c = character();
    c.customPowers = [power];
    c.pinnedPowerIds = [power.id];
    c.arcaneBackgroundId = 'huckster';
    if (version === 2) {
      delete c.promotions;
      delete c.creationLocked;
    }
    storage.set('swade:character', JSON.stringify(c));
    storage.set('swade:schemaVersion', String(version));
    for (const filterEnabled of [false, true]) {
      const loaded = loadCharacter();
      loaded.abFilterEnabled = filterEnabled;
      saveCharacter(loaded);
      const reloaded = loadCharacter();
      assert.deepEqual(reloaded.customPowers, [power], `schema ${version}, filter ${filterEnabled}`);
      assert.deepEqual(reloaded.pinnedPowerIds, [power.id]);
      assert.deepEqual(replayPromotions(reloaded, defaultSettings).character.customPowers, [power]);
    }
  }
});

test('version 1 saves run pinned-power cleanup and promotion migration together', () => {
  const c = character();
  delete c.promotions;
  c.powers = [{ powerId: 'strela' }];
  c.pinnedPowerIds = ['strela', 'missing-power'];
  c.advancesUsed = 2;
  const imported = importCharacterJson(JSON.stringify({ schemaVersion: 1, character: c }));
  assert.deepEqual(imported.character.pinnedPowerIds, ['strela']);
  assert.equal(imported.character.advancesUsed, 2);
  assert.equal(imported.character.promotions.legacyBaseline, true);
});

test('malformed imported promotion values are bounded and validated', () => {
  assert.equal(promotionCount(-2), 0);
  assert.equal(promotionCount(1.5), 1);
  assert.equal(promotionCount(Infinity), 0);
  const c = progressed({ 'earned-1': [{ kind: 'skill', skillId: ridingId, points: -1 }], 'earned-999999999': [learn(ridingId)], 'earned-3-bonus': [learn(ridingId)] });
  const imported = importCharacterJson(exportCharacterJson(c, defaultSettings, null));
  assert.deepEqual(imported.character.promotions.allocations, { 'earned-1': [] });
  assert.equal(promotionRows(imported.character, imported.settings).length, 1);
});

test('disabling a bonus revalidates later skill allocations', () => {
  const c = progressed({
    'earned-4-bonus': [attribute('agility')],
    'earned-5': [upgrade(ridingId, 1), upgrade('atletika', 1)],
  }, 5);
  c.skills[ridingId] = 'd4';
  const enabled = { ...defaultSettings, doubleEveryFourthPromotion: true };
  const active = replayPromotions(c, enabled);
  assert.equal(active.rows.find((row) => row.key === 'earned-5').status, 'applied');
  assert.equal(active.character.skills[ridingId], 'd6');
  const disabled = replayPromotions(c, defaultSettings);
  assert.equal(disabled.rows.find((row) => row.key === 'earned-5').status, 'invalid');
  assert.equal(disabled.character.skills[ridingId], 'd4');
  assert.equal(disabled.character.skills.atletika, 'd4');
});

test('promotion-granted arcane backgrounds replay without changing creation or resources', () => {
  const { ARCANE_BACKGROUNDS } = compiled('data/index.js');
  const ab = ARCANE_BACKGROUNDS[0];
  const c = progressed({ 'earned-1': [{ kind: 'edge', edgeId: 'misticheskii-dar', points: 2, arcaneBackgroundId: ab.id }] });
  c.powerPoints = 3;
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'applied');
  assert.equal(result.character.arcaneBackgroundId, ab.id);
  assert.equal(c.arcaneBackgroundId, null);
  assert.equal(result.character.powerPoints, 3);
  c.arcaneBackgroundId = ab.id;
  assert.equal(replayPromotions(c, defaultSettings).rows[0].status, 'invalid');
});

test('blank custom skill definitions remain pending and duplicate ordinary edges do not apply', () => {
  const c = progressed({ 'earned-1': [{ kind: 'learnSkill', skillId: 'custom-x', points: 2, customSkill: { id: 'custom-x', name: '', linkedAttribute: 'smarts' } }] });
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'empty');
  assert.equal(result.rows[0].error, undefined);
  assert.equal(result.character.customSkills.length, 0);
  const { EDGES } = compiled('data/index.js');
  const ordinary = EDGES.find((edge) => edge.source === 'core' && edge.category === 'combat');
  c.edges = [{ edgeId: ordinary.id }];
  c.promotions.allocations['earned-1'] = [{ kind: 'edge', edgeId: ordinary.id, points: 2 }];
  assert.equal(replayPromotions(c, defaultSettings).rows[0].status, 'invalid');
});

test('choosing a promotion type without a target is neutral and applies nothing', () => {
  for (const allocation of [upgrade(''), learn(''), { kind: 'edge', edgeId: '', points: 2 }]) {
    const c = progressed({ 'earned-1': [allocation], 'earned-2': [attribute('spirit')] }, 2);
    const result = replayPromotions(c, defaultSettings);
    assert.equal(result.rows[0].status, 'empty');
    assert.equal(result.rows[0].error, undefined);
    assert.equal(result.rows[1].status, 'applied');
    assert.equal(result.character.attributes.spirit, 'd6');
  }
});

test('an unfinished split allocation applies neither part until both skills are selected', () => {
  const c = progressed({ 'earned-1': [upgrade('atletika', 1), upgrade('', 1)] });
  c.attributes.agility = 'd8';
  const pending = replayPromotions(c, defaultSettings);
  assert.equal(pending.rows[0].status, 'empty');
  assert.equal(pending.character.skills.atletika, 'd4');
  c.promotions.allocations['earned-1'][1] = upgrade(ridingId, 1);
  const invalid = replayPromotions(c, defaultSettings);
  assert.equal(invalid.rows[0].status, 'invalid');
  assert.equal(invalid.character.skills.atletika, 'd4');
});

test('edge promotions grant slots without selecting or changing any edge', () => {
  const c = progressed({ 'earned-1': [{ kind: 'edgeSlot', points: 2 }] });
  const result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'applied');
  assert.equal(result.edgeSlots, 1);
  assert.equal(edgeCap(result.edgeSlots), 3);
  assert.deepEqual(result.character.edges, []);
  assert.deepEqual(result.character.customEdges, []);
});

test('managed edge requirements use current rank and tracked power-point edges retain frequency warnings', () => {
  const c = progressed({
    'earned-1': [{ kind: 'edgeSlot', points: 2, edgeId: 'punkty-sily' }],
    'earned-2': [{ kind: 'edgeSlot', points: 2, edgeId: 'punkty-sily' }],
  }, 4);
  c.edges = [{ edgeId: 'slava' }, { edgeId: 'slava-plus' }, { edgeId: 'misticheskii-dar' }, { edgeId: 'punkty-sily', count: 2 }];
  assert.match(edgeRequirementWarnings({ ...c, advancesUsed: 0 })[0], /ранга/);
  const result = replayPromotions(c, defaultSettings);
  assert.deepEqual(edgeRequirementWarnings(result.character), []);
  assert.ok(result.rows[1].warnings.some((warning) => /уже выбраны на этом ранге/.test(warning)));
  assert.equal(result.rows[1].status, 'applied');
});

test('optional promotion references follow picked edges and missing references only warn', () => {
  const edge = { id: 'connection', name: 'Connection', description: '', countsTowardLimit: true };
  const c = progressed({ 'earned-1': [{ kind: 'edgeSlot', points: 2, customEdgeId: edge.id }] });
  c.customEdges = [edge];
  let result = replayPromotions(c, defaultSettings);
  assert.match(result.rows[0].changes[0], /Connection/);
  assert.deepEqual(result.character.customEdges, [edge]);
  c.customEdges[0].name = 'Edited connection';
  result = replayPromotions(c, defaultSettings);
  assert.match(result.rows[0].changes[0], /Edited connection/);
  c.customEdges = [];
  result = replayPromotions(c, defaultSettings);
  assert.equal(result.rows[0].status, 'applied');
  assert.equal(result.edgeSlots, 1);
  assert.equal(result.rows[0].warnings.length, 1);
  assert.deepEqual(result.character.customEdges, []);
});

test('edge slot credits affect the point pool and withdrawing credit retains picked edges', () => {
  const c = progressed({ 'earned-1': [{ kind: 'edgeSlot', points: 2 }] });
  c.edges = [{ edgeId: 'novye-sily', count: 3 }];
  const totals = () => characterPointTotals({ c, baseSkillIds: BASE_SKILL_IDS,
    linkedAttrFor: (id) => SKILL_BY_ID.get(id)?.linkedAttribute, hindranceMap: HINDRANCE_BY_ID,
    promotionEdgeSlots: replayPromotions(c, defaultSettings).edgeSlots });
  assert.equal(totals().free, 0);
  c.advancesUsed = 0;
  assert.equal(totals().free, -2);
  assert.equal(replayPromotions(c, defaultSettings).character.edges[0].count, 3);
});

test('free custom edges and arcane backgrounds are excluded, counted custom edges consume slots', () => {
  const c = character();
  c.edges = [{ edgeId: 'misticheskii-dar' }, { edgeId: 'novye-sily', count: 2 }];
  c.customEdges = [{ id: 'connection', name: 'Connection', description: '', countsTowardLimit: false }];
  assert.equal(edgeCount(c), 2);
  c.customEdges[0].countsTowardLimit = true;
  assert.equal(edgeCount(c), 3);
  const imported = importCharacterJson(exportCharacterJson(c, defaultSettings, null));
  assert.deepEqual(imported.character.customEdges, c.customEdges);
  assert.equal(edgeCount(imported.character), 3);
});

test('bonus and veteran edge slots follow active promotion fields without changing rank count', () => {
  const c = progressed({ 'earned-4': [{ kind: 'edgeSlot', points: 2 }],
    'earned-4-bonus': [{ kind: 'edgeSlot', points: 2 }],
    'veteran-1': [{ kind: 'edgeSlot', points: 2 }] }, 4);
  c.edges = [{ edgeId: VETERAN_EDGE_ID }];
  const normal = replayPromotions(c, defaultSettings);
  const doubled = replayPromotions(c, { ...defaultSettings, doubleEveryFourthPromotion: true });
  assert.equal(normal.edgeSlots, 2);
  assert.equal(doubled.edgeSlots, 3);
  assert.equal(doubled.character.advancesUsed, 8);
  assert.equal(normal.character.advancesUsed, 8);
});

test('legacy edge awards move to the edges tab once while preserving repeated and custom edges', () => {
  const edge = { id: 'connection', name: 'Connection', description: '' };
  const c = progressed({
    'earned-1': [{ kind: 'edge', edgeId: 'novye-sily', points: 2 }],
    'earned-2': [{ kind: 'customEdge', edge, points: 2 }],
  }, 2);
  c.edges = [{ edgeId: 'novye-sily' }];
  const imported = importCharacterJson(JSON.stringify({ schemaVersion: 3, character: c, settings: defaultSettings }));
  assert.equal(imported.character.edges[0].count, 2);
  assert.equal(imported.character.customEdges[0].countsTowardLimit, true);
  assert.deepEqual(imported.character.promotions.allocations['earned-1'], [{ kind: 'edgeSlot', edgeId: 'novye-sily', points: 2 }]);
  assert.deepEqual(imported.character.promotions.allocations['earned-2'], [{ kind: 'edgeSlot', customEdgeId: edge.id, points: 2 }]);
  assert.equal(replayPromotions(imported.character, imported.settings).edgeSlots, 2);
  const reimported = importCharacterJson(exportCharacterJson(imported.character, imported.settings, null));
  assert.deepEqual(reimported.character, imported.character);
});
