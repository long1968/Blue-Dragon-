import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractScript(id) {
  const match = html.match(new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `Missing script #${id}`);
  return match[1];
}

class ClassList {
  constructor(element) {
    this.element = element;
    this.values = new Set();
  }

  add(...names) {
    names.forEach(name => this.values.add(name));
  }

  remove(...names) {
    names.forEach(name => this.values.delete(name));
  }

  toggle(name) {
    if (this.values.has(name)) {
      this.values.delete(name);
      return false;
    }
    this.values.add(name);
    return true;
  }
}

class Element {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.className = '';
    this.classList = new ClassList(this);
    this.dataset = {};
    this.attributes = new Map();
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.listeners = new Map();
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (value === '') this.children = [];
  }

  get innerHTML() {
    return this._innerHTML ?? '';
  }

  append(child) {
    this.children.push(child);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  querySelectorAll(selector) {
    if (selector === 'button') return this.children.filter(child => child.tagName === 'button');
    if (selector === '.answer-button') return this.children.filter(child => child.className.split(/\s+/).includes('answer-button'));
    return [];
  }

  insertAdjacentHTML(_position, value) {
    this._innerHTML = `${this._innerHTML ?? ''}${value}`;
  }

  scrollIntoView() {}
}

const ids = [
  'start-screen', 'game-screen', 'question-number', 'question-en', 'question-vi',
  'difficulty-label', 'answers', 'ladder', 'mobile-level', 'mobile-prize',
  'hint-panel', 'feedback', 'feedback-title', 'feedback-explanation',
  'feedback-prize', 'restart-button', 'lifeline-fifty', 'lifeline-hint',
  'lifeline-swap', 'ladder-toggle', 'start-button'
];
const elements = new Map(ids.map(id => [id, new Element(id)]));
elements.set('question-bank', Object.assign(new Element('question-bank'), {textContent: extractScript('question-bank')}));

const document = {
  getElementById(id) {
    return elements.get(id);
  },
  createElement(tagName) {
    const element = new Element();
    element.tagName = tagName;
    return element;
  },
  addEventListener() {}
};
const window = {setTimeout(callback) { callback(); }};
const sandbox = {window, document, console};

vm.runInNewContext(extractScript('game-core'), sandbox);
vm.runInNewContext(extractScript('game-controller'), sandbox);

const game = window.MillionaireGame;
game.startGame();
assert.equal(game.state.status, 'playing');
assert.equal(game.state.questions.length, 15);
assert.equal(new Set(game.state.questions.map(question => question.id)).size, 15);
assert.equal(elements.get('answers').children.length, 4);

game.useFiftyFifty();
assert.equal(game.state.lifelines.fifty, false);
assert.equal(game.state.hiddenAnswers.size, 2);
assert.equal(elements.get('answers').children.filter(button => button.disabled).length, 2);

game.useHint();
assert.equal(game.state.lifelines.hint, false);
assert.match(elements.get('hint-panel').textContent, /^ChatGPT gợi ý: /);

const originalId = game.state.questions[0].id;
const originalTier = game.state.questions[0].tier;
game.useSwap();
assert.equal(game.state.lifelines.swap, false);
assert.equal(game.state.questions[0].tier, originalTier);
assert.notEqual(game.state.questions[0].id, originalId);
assert.equal(game.state.currentIndex, 0);

const current = game.state.questions[0];
const wrongIndex = current.answers.findIndex((_, index) => index !== current.correctIndex);
game.selectAnswer(wrongIndex);
assert.equal(game.state.status, 'lost');
assert.match(elements.get('feedback-title').textContent, /^Đáp án đúng:/);
assert.equal(elements.get('feedback-prize').textContent, 'Mức thưởng an toàn: 0₫');

game.startGame();
assert.deepEqual({...game.state.lifelines}, {fifty: true, hint: true, swap: true});
game.state.currentIndex = 14;
game.state.correctCount = 14;
game.renderQuestion();
game.selectAnswer(game.state.questions[14].correctIndex);
assert.equal(game.state.status, 'won');
assert.equal(elements.get('feedback-prize').textContent, 'Giải thưởng: 150.000.000₫');

console.log('PASS DOM smoke: start, lifelines, same-tier swap, loss, restart, and 15-question win');
