const assert = require('node:assert/strict');
const { test } = require('node:test');
const { join } = require('node:path');
const compiled = (file) => require(join(process.env.SWADE_TEST_BUILD, file));
const { defaultCharacter, defaultSettings } = compiled('storage/defaults.js');
const { characterPointTotalsFor, powerCount, powerSlots } = compiled('store/selectors.js');
const { ARCANE_BACKGROUND_BY_ID } = compiled('data/index.js');
const { exportCharacterJson, importCharacterJson } = compiled('storage/persist.js');

function customPower(id, countsTowardLimit) {
  return { id, name: id, powerPoints: '2', range: 'Self', duration: '5',
    ...(countsTowardLimit === undefined ? {} : { countsTowardLimit }) };
}

test('custom hindrances never fund creation, with or without the lock', () => {
  for (const creationLocked of [false, true]) {
    const c = { ...structuredClone(defaultCharacter), creationLocked };
    c.customHindrances = [
      { id: 'minor', name: 'Minor', severity: 'minor' },
      { id: 'major', name: 'Major', severity: 'major' },
    ];
    assert.deepEqual(characterPointTotalsFor(c).hindrancePoints, { minor: 0, major: 0, total: 0 });
    assert.equal(characterPointTotalsFor(c).edgeLimit, 2);
    c.hindrances = [{ hindranceId: 'geroizm', severity: 'major' }];
    assert.equal(characterPointTotalsFor(c).hindrancePoints.total, 2);
    assert.equal(characterPointTotalsFor(c).edgeLimit, 3);
  }
});

test('custom powers consume slots only when opted in, and editing the flag releases a slot', () => {
  const c = structuredClone(defaultCharacter);
  c.powers = [{ powerId: 'strela' }];
  c.customPowers = [customPower('legacy'), customPower('free', false), customPower('counted', true)];
  assert.equal(powerCount(c), 2);
  assert.equal(powerSlots(c), 0);
  c.customPowers[2].countsTowardLimit = false;
  assert.equal(powerCount(c), 1);
  c.arcaneBackgroundId = 'huckster';
  c.edges = [{ edgeId: 'novye-sily', count: 2 }];
  assert.equal(powerSlots(c), ARCANE_BACKGROUND_BY_ID.get('huckster').startingPowers + 4);
});

test('custom power slot flags survive export and reload; old powers stay free', () => {
  const c = structuredClone(defaultCharacter);
  c.customPowers = [customPower('legacy'), customPower('free', false), customPower('counted', true)];
  c.pinnedPowerIds = ['counted'];
  const imported = importCharacterJson(exportCharacterJson(c, defaultSettings, null));
  assert.deepEqual(imported.character.customPowers, c.customPowers);
  assert.deepEqual(imported.character.pinnedPowerIds, ['counted']);
  assert.equal(powerCount(imported.character), 1);
});

test('invalid custom power slot flags are rejected on import', () => {
  const c = structuredClone(defaultCharacter);
  c.customPowers = [customPower('valid', true), customPower('invalid', 'yes')];
  const imported = importCharacterJson(exportCharacterJson(c, defaultSettings, null));
  assert.deepEqual(imported.character.customPowers, [customPower('valid', true)]);
});
