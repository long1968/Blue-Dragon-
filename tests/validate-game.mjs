import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractJsonScript(id) {
  const pattern = new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`);
  const match = html.match(pattern);
  assert.ok(match, `Missing JSON script #${id}`);
  return JSON.parse(match[1]);
}

const bank = extractJsonScript('question-bank');
assert.equal(bank.length, 65);
assert.deepEqual([...new Set(bank.map(q => q.id))].sort((a, b) => a - b), Array.from({length: 65}, (_, i) => i + 1));
assert.deepEqual([...new Set(bank.map(q => q.sourceRef))].sort((a, b) => a - b), Array.from({length: 65}, (_, i) => i + 1));
assert.deepEqual(
  Object.fromEntries(['easy', 'medium', 'hard'].map(tier => [tier, bank.filter(q => q.tier === tier).length])),
  {easy: 20, medium: 20, hard: 25}
);

for (const q of bank) {
  assert.ok(Number.isInteger(q.id) && Number.isInteger(q.sourceRef));
  assert.ok(['easy', 'medium', 'hard'].includes(q.tier));
  assert.ok(q.questionEn.trim() && q.questionVi.trim());
  assert.equal(q.answers.length, 4);
  assert.ok(q.answers.every(a => a.en.trim() && a.vi.trim()));
  assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4);
  assert.ok(q.hint.trim() && q.explanation.trim());
  assert.ok(!new RegExp(`(?:đáp án|answer)\\s*(?:là|is)?\\s*[ABCD]`, 'i').test(q.hint));
}

const answerCounts = [0, 0, 0, 0];
bank.forEach(q => answerCounts[q.correctIndex]++);
assert.ok(Math.max(...answerCounts) - Math.min(...answerCounts) <= 2, `Unbalanced answers: ${answerCounts}`);

const expectedTier = new Map();
for (const id of [1,2,4,6,7,9,10,11,13,16,20,21,22,26,29,34,41,49,51,59]) expectedTier.set(id, 'easy');
for (const id of [3,5,8,12,14,15,17,18,19,23,24,25,28,30,32,35,38,39,46,47]) expectedTier.set(id, 'medium');
for (const id of [27,31,33,36,37,40,42,43,44,45,48,50,52,53,54,55,56,57,58,60,61,62,63,64,65]) expectedTier.set(id, 'hard');
for (const q of bank) assert.equal(q.tier, expectedTier.get(q.sourceRef));

function extractJsScript(id) {
  const pattern = new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`);
  const match = html.match(pattern);
  assert.ok(match, `Missing JavaScript #${id}`);
  return match[1];
}

const sandbox = {window: {}};
vm.runInNewContext(extractJsScript('game-core'), sandbox);
const core = sandbox.window.GameCore;
assert.ok(core);

const selected = core.selectGameQuestions(bank, () => 0.42);
assert.equal(selected.length, 15);
assert.equal(selected.slice(0, 5).map(q => q.tier).join(','), Array(5).fill('easy').join(','));
assert.equal(selected.slice(5, 10).map(q => q.tier).join(','), Array(5).fill('medium').join(','));
assert.equal(selected.slice(10).map(q => q.tier).join(','), Array(5).fill('hard').join(','));
assert.equal(new Set(selected.map(q => q.id)).size, 15);

const seen = new Set(bank.filter(q => q.tier === 'medium').slice(0, 5).map(q => q.id));
const replacement = core.findReplacement(bank, 'medium', seen, () => 0.5);
assert.equal(replacement.tier, 'medium');
assert.ok(!seen.has(replacement.id));

const sample = bank[0];
const hidden = core.getFiftyFiftyHidden(sample, () => 0.25);
assert.equal(hidden.length, 2);
assert.ok(!hidden.includes(sample.correctIndex));
assert.equal(new Set(hidden).size, 2);

assert.equal(core.getSafePrize(0), '0₫');
assert.equal(core.getSafePrize(4), '0₫');
assert.equal(core.getSafePrize(5), '1.000.000₫');
assert.equal(core.getSafePrize(9), '1.000.000₫');
assert.equal(core.getSafePrize(10), '14.000.000₫');
assert.equal(core.getSafePrize(15), '150.000.000₫');

const originalIds = bank.map(q => q.id);
core.selectGameQuestions(bank, () => 0.1);
assert.deepEqual(bank.map(q => q.id), originalIds, 'Selection must not mutate the bank');

const everyHardId = new Set(bank.filter(q => q.tier === 'hard').map(q => q.id));
assert.equal(core.findReplacement(bank, 'hard', everyHardId, () => 0.1), null);

for (const id of ['start-screen','game-screen','question-number','question-en','question-vi','answers','ladder','lifeline-fifty','lifeline-hint','lifeline-swap','feedback','restart-button']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Missing #${id}`);
}
assert.match(html, /aria-live=["']polite["']/);
assert.match(html, /aria-live=["']assertive["']/);
assert.match(html, /addEventListener\(["']keydown["']/);
assert.match(html, /@media\s*\(max-width:\s*760px\)/);
assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
assert.match(html, /:focus-visible/);
assert.match(html, /min-height:\s*48px/);
assert.match(html, /\.answer(?:-button)?\.correct/);
assert.match(html, /\.answer(?:-button)?\.wrong/);

console.log('PASS content:', bank.length, 'questions', {easy: 20, medium: 20, hard: 25}, 'answers', answerCounts);
console.log('PASS engine: 15-question selection, same-tier replacement, 50:50, safe prizes, no bank mutation');
console.log('PASS UI contracts: controls, live regions, keyboard hook, responsive and reduced-motion styles');
