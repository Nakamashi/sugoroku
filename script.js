// Edit these arrays to change classroom content.
const activityPhrases = [
  'START', 'living in Kanagawa', 'making cakes', 'playing the guitar',
  'studying English', 'watching movies', 'reading books', 'cooking dinner',
  'using a computer', 'taking photos', 'playing baseball', 'drinking coffee',
  'cleaning my room', 'learning Japanese', 'listening to music', 'walking to school',
  'drawing pictures', 'working at a cafe', 'playing video games', 'practicing piano',
  'writing stories', 'waiting for a friend', 'talking on the phone', 'exercising every day',
  'visiting Yokohama'
];

const allTimePhrases = [
  'for two days', 'for three days', 'for one week', 'for two weeks', 'for three weeks',
  'for one month', 'for two months', 'for six months', 'for a year', 'for a long time',
  'since yesterday', 'since last week', 'since last month', 'since last year', 'since April',
  'since 2020', 'since I was ten', 'since elementary school', 'since this morning', 'since Monday'
];

// The board is a directed graph. Most spaces have exactly one forward option; the
// few branches are spaced apart so a turn rarely asks students to choose twice.
const BONUS_SPACE_POINTS = 3;
const INITIAL_BONUS_SPACE_ID = 5;
const BONUS_CANDIDATE_SPACE_IDS = boardCandidateIds();
const connectorCurves = {
  '3-8': 14,
  '8-9': -8,
  '13-18': -16,
  '18-19': 10,
  '23-0': -12
};
const boardSpaces = [
  { id: 0, phrase: activityPhrases[0], x: 12, y: 82, next: [1] },
  { id: 1, phrase: activityPhrases[1], x: 12, y: 58, next: [2] },
  { id: 2, phrase: activityPhrases[2], x: 12, y: 34, next: [3] },
  { id: 3, phrase: activityPhrases[3], x: 25, y: 16, next: [4, 8] },
  { id: 4, phrase: activityPhrases[4], x: 42, y: 16, next: [5] },
  { id: 5, phrase: activityPhrases[5], x: 59, y: 16, next: [6] },
  { id: 6, phrase: activityPhrases[6], x: 76, y: 16, next: [7] },
  { id: 7, phrase: activityPhrases[7], x: 88, y: 34, next: [13] },
  { id: 8, phrase: activityPhrases[8], x: 31, y: 39, next: [9] },
  { id: 9, phrase: activityPhrases[9], x: 48, y: 39, next: [10] },
  { id: 10, phrase: activityPhrases[10], x: 65, y: 39, next: [11] },
  { id: 11, phrase: activityPhrases[11], x: 82, y: 39, next: [12] },
  { id: 12, phrase: activityPhrases[12], x: 72, y: 60, next: [13] },
  { id: 13, phrase: activityPhrases[13], x: 88, y: 60, next: [14, 18] },
  { id: 14, phrase: activityPhrases[14], x: 70, y: 72, next: [15] },
  { id: 15, phrase: activityPhrases[15], x: 52, y: 72, next: [16] },
  { id: 16, phrase: activityPhrases[16], x: 34, y: 72, next: [17] },
  { id: 17, phrase: activityPhrases[17], x: 18, y: 72, next: [23] },
  { id: 18, phrase: activityPhrases[18], x: 88, y: 82, next: [19] },
  { id: 19, phrase: activityPhrases[19], x: 70, y: 90, next: [20] },
  { id: 20, phrase: activityPhrases[20], x: 52, y: 90, next: [21] },
  { id: 21, phrase: activityPhrases[21], x: 34, y: 90, next: [22] },
  { id: 22, phrase: activityPhrases[22], x: 18, y: 90, next: [23] },
  { id: 23, phrase: activityPhrases[23], x: 8, y: 90, next: [24, 0] },
  { id: 24, phrase: activityPhrases[24], x: 8, y: 72, next: [0] }
];

const playerColors = ['#3578e5', '#ef476f', '#22a06b'];
let players = [];
let currentPlayerIndex = 0;
let currentPrediction = null;
let currentRoll = null;
let currentTimePhrases = [];
let controlsLocked = false;
let activeBonusSpaceId = INITIAL_BONUS_SPACE_ID;

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

$('startButton').addEventListener('click', startGame);
$('rollButton').addEventListener('click', rollDie);
$('nextTurnButton').addEventListener('click', nextTurn);
$('endGameButton').addEventListener('click', endGame);
$('newGameButton').addEventListener('click', startNewGame);
document.querySelectorAll('input[name="playerCount"]').forEach((input) => {
  input.addEventListener('change', renderNameInputs);
});
renderNameInputs();

function renderNameInputs() {
  const count = Number(document.querySelector('input[name="playerCount"]:checked').value);
  $('nameFields').innerHTML = Array.from({ length: count }, (_, i) => `
    <label class="name-field">
      <span>Player ${i + 1} name</span>
      <input type="text" maxlength="18" value="Player ${i + 1}" data-player-name="${i}" />
    </label>`).join('');
}

function startGame() {
  const count = Number(document.querySelector('input[name="playerCount"]:checked').value);
  const nameInputs = [...document.querySelectorAll('[data-player-name]')];
  players = Array.from({ length: count }, (_, i) => {
    const typedName = nameInputs[i]?.value.trim();
    return {
      name: typedName || `Player ${i + 1}`,
      score: 0,
      position: 0,
      color: playerColors[i],
      token: `P${i + 1}`
    };
  });
  activeBonusSpaceId = INITIAL_BONUS_SPACE_ID;
  $('startScreen').classList.add('hidden');
  $('gameScreen').classList.remove('hidden');
  drawBoard();
  beginTurn();
}

function endGame() {
  if (!confirm('End the game and show the results?')) return;
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const winners = sorted.filter((p) => p.score === topScore).map((p) => p.name).join(' and ');
  $('resultsTitle').textContent = winners ? `${winners} wins!` : 'Great work!';
  $('resultsList').innerHTML = sorted.map((p, index) => `
    <div class="result-row">
      <span>${index + 1}. ${p.name}</span><span>${p.score} pts</span>
    </div>`).join('');
  $('resultsSplash').classList.remove('hidden');
}

function startNewGame() {
  players = [];
  currentPlayerIndex = 0;
  $('resultsSplash').classList.add('hidden');
  $('gameScreen').classList.add('hidden');
  $('startScreen').classList.remove('hidden');
}

function beginTurn() {
  currentPrediction = null;
  currentRoll = null;
  controlsLocked = false;
  currentTimePhrases = pickSixTimePhrases();
  $('dice').textContent = '?';
  $('turnSummary').textContent = 'Roll to see this turn\'s points.';
  clearBranchOptions();
  $('nextTurnButton').classList.add('hidden');
  $('rollButton').disabled = true;
  $('turnInstruction').textContent = 'Choose your prediction before rolling.';
  renderAll();
}

function pickSixTimePhrases() {
  return [...allTimePhrases].sort(() => Math.random() - 0.5).slice(0, 6);
}

function renderAll() {
  renderScoreboard();
  renderTimeTable();
  renderPredictionButtons();
  updateTokens();
  $('currentPlayerName').textContent = players[currentPlayerIndex]?.name || 'Player 1';
}

function renderScoreboard() {
  $('scoreboard').innerHTML = players.map((p, i) => `
    <div class="player-score ${i === currentPlayerIndex ? 'active' : ''}">
      <span><span class="token-dot" style="background:${p.color}"></span>${p.name}</span>
      <span>${p.score} pts</span>
    </div>`).join('');
}

function renderTimeTable() {
  $('timePhraseTable').innerHTML = currentTimePhrases.map((phrase, i) => `
    <div class="time-row ${currentRoll === i + 1 ? 'selected' : ''}">
      <span class="time-number">${i + 1}</span><span>${phrase}</span>
    </div>`).join('');
}

function renderPredictionButtons() {
  $('predictionButtons').innerHTML = [1, 2, 3, 4, 5, 6].map((n) => `
    <button class="prediction-button ${currentPrediction === n ? 'selected' : ''}" type="button" data-predict="${n}" ${controlsLocked || currentRoll ? 'disabled' : ''}>${n}</button>
  `).join('');
  document.querySelectorAll('[data-predict]').forEach((button) => {
    button.addEventListener('click', () => selectPrediction(Number(button.dataset.predict)));
  });
}

function selectPrediction(number) {
  if (controlsLocked || currentRoll) return;
  currentPrediction = number;
  $('rollButton').disabled = false;
  renderPredictionButtons();
}

async function rollDie() {
  if (!currentPrediction || controlsLocked) return;
  controlsLocked = true;
  $('rollButton').disabled = true;
  renderPredictionButtons();
  $('turnInstruction').textContent = 'Rolling...';
  $('dice').classList.add('rolling');
  const animationEnd = Date.now() + 1300;
  while (Date.now() < animationEnd) {
    $('dice').textContent = Math.ceil(Math.random() * 6);
    await sleep(110);
  }
  currentRoll = Math.ceil(Math.random() * 6);
  $('dice').classList.remove('rolling');
  $('dice').textContent = currentRoll;
  renderTimeTable();
  await resolveTurn();
}

async function resolveTurn() {
  const player = players[currentPlayerIndex];
  const bonus = currentPrediction === currentRoll ? 1 : 0;
  if (bonus) {
    player.score += 1;
    showPredictionCelebration();
    await sleep(1600);
  }
  const startPasses = await movePlayer(player, currentRoll);
  const landed = boardSpaces[player.position];
  const landingPoints = landed.id === 0 ? 0 : 1;
  player.score += landingPoints;
  if (landingPoints) showFloating('+1 landing point');
  const starBonus = awardBonusSpace(player, landed);
  highlightSpace(landed.id);

  const startText = startPasses ? `, earned ${startPasses * 2} START bonus point${startPasses > 1 ? 's' : ''}` : '';
  const starText = starBonus ? `, claimed a Star bonus for +${starBonus}` : '';
  $('turnSummary').textContent = `${player.name} rolled ${currentRoll}, predicted ${currentPrediction}, got ${bonus} prediction bonus point${startText}, landed on “${landed.phrase}”, earned ${landingPoints} landing point${starText}.`;
  $('turnInstruction').textContent = 'Turn complete. Click Next Turn.';
  $('nextTurnButton').classList.remove('hidden');
  controlsLocked = true;
  renderAll();
}

async function movePlayer(player, steps) {
  let startPasses = 0;
  for (let i = 0; i < steps; i++) {
    const currentSpace = boardSpaces[player.position];
    let nextId = currentSpace.next[0];
    if (currentSpace.next.length > 1) {
      nextId = await chooseBranch(currentSpace);
    }
    player.position = nextId;
    if (nextId === 0) {
      startPasses += 1;
      player.score += 2;
      animateStartBonus();
      showFloating('+2 START bonus');
    }
    updateTokens({ movingPlayerIndex: currentPlayerIndex });
    await sleep(700);
  }
  return startPasses;
}

function chooseBranch(space) {
  return new Promise((resolve) => {
    $('turnInstruction').textContent = 'Choose a highlighted forward path on the board.';
    clearBranchOptions();
    space.next.forEach((id) => {
      const node = $(`space-${id}`);
      node.classList.add('branch-option');
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      const choose = () => {
        clearBranchOptions();
        resolve(id);
      };
      node._branchClick = choose;
      node.addEventListener('click', choose, { once: true });
      node.addEventListener('keydown', handleBranchKey);
    });
  });
}

function handleBranchKey(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.currentTarget.click();
  }
}

function clearBranchOptions() {
  document.querySelectorAll('.branch-option').forEach((node) => {
    node.classList.remove('branch-option');
    node.removeAttribute('role');
    node.removeAttribute('tabindex');
    if (node._branchClick) {
      node.removeEventListener('click', node._branchClick);
      node._branchClick = null;
    }
    node.removeEventListener('keydown', handleBranchKey);
  });
}

function drawBoard() {
  const board = $('board');
  board.innerHTML = '<svg id="pathLayer" class="path-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrowHead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z"></path></marker></defs></svg>';
  boardSpaces.forEach((space) => {
    space.next.forEach((nextId) => drawConnector(space, boardSpaces[nextId]));
  });
  boardSpaces.forEach((space) => {
    const node = document.createElement('div');
    node.id = `space-${space.id}`;
    node.className = `space ${space.id === 0 ? 'start' : ''} ${space.id === activeBonusSpaceId ? 'bonus-space' : ''}`;
    node.style.left = `${space.x}%`;
    node.style.top = `${space.y}%`;
    node.innerHTML = getSpaceContent(space);
    board.appendChild(node);
  });
  players.forEach((player, i) => {
    const token = document.createElement('div');
    token.id = `token-${i}`;
    token.className = 'token';
    token.style.background = player.color;
    token.textContent = player.token;
    board.appendChild(token);
  });
}

function drawConnector(from, to) {
  const pathLayer = $('pathLayer');
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const unitX = dx / distance;
  const unitY = dy / distance;
  const nodePadding = 6.2;
  const startX = from.x + unitX * nodePadding;
  const startY = from.y + unitY * nodePadding;
  const endX = to.x - unitX * nodePadding;
  const endY = to.y - unitY * nodePadding;
  const curve = connectorCurves[`${from.id}-${to.id}`] || 0;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'connector');
  if (curve) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const controlX = midX + (-unitY * curve);
    const controlY = midY + (unitX * curve);
    path.setAttribute('d', `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
  } else {
    path.setAttribute('d', `M ${startX} ${startY} L ${endX} ${endY}`);
  }
  pathLayer.appendChild(path);
}

function updateTokens(options = {}) {
  const movingPlayerIndex = typeof options === 'object' ? options.movingPlayerIndex : (options ? currentPlayerIndex : null);
  players.forEach((player, i) => {
    const token = $(`token-${i}`);
    if (!token) return;
    const space = boardSpaces[player.position];
    const offset = (i - 1) * 18;
    token.style.left = `calc(${space.x}% + ${offset}px)`;
    token.style.top = `calc(${space.y}% + ${offset}px)`;
    token.classList.toggle('moving', i === movingPlayerIndex);
  });
  if (movingPlayerIndex !== null && movingPlayerIndex !== undefined) {
    setTimeout(() => $(`token-${movingPlayerIndex}`)?.classList.remove('moving'), 500);
  }
}


function boardCandidateIds() {
  return activityPhrases.map((_, id) => id).filter((id) => id !== 0);
}

function getSpaceContent(space) {
  if (space.id === 0) return 'START';
  const star = space.id === activeBonusSpaceId ? '<span class="bonus-badge" aria-label="Star bonus space">★</span>' : '';
  return `${star}<span>${space.phrase}</span>`;
}

function renderBonusSpaces() {
  boardSpaces.forEach((space) => {
    const node = $(`space-${space.id}`);
    if (!node) return;
    node.classList.toggle('bonus-space', space.id === activeBonusSpaceId);
    node.innerHTML = getSpaceContent(space);
  });
}

function awardBonusSpace(player, space) {
  if (space.id !== activeBonusSpaceId) return 0;
  player.score += BONUS_SPACE_POINTS;
  showFloating(`Star bonus! +${BONUS_SPACE_POINTS}`);
  const oldBonusId = activeBonusSpaceId;
  activeBonusSpaceId = pickNextBonusSpace(oldBonusId);
  renderBonusSpaces();
  const node = $(`space-${oldBonusId}`);
  node.classList.add('bonus-claimed');
  setTimeout(() => node.classList.remove('bonus-claimed'), 1100);
  return BONUS_SPACE_POINTS;
}

function pickNextBonusSpace(previousId) {
  const previous = boardSpaces[previousId];
  const candidates = BONUS_CANDIDATE_SPACE_IDS
    .filter((id) => id !== previousId && !players.some((player) => player.position === id))
    .map((id) => {
      const space = boardSpaces[id];
      return { id, distance: Math.hypot(space.x - previous.x, space.y - previous.y) };
    })
    .sort((a, b) => b.distance - a.distance);
  if (!candidates.length) return INITIAL_BONUS_SPACE_ID;
  const farthestGroupSize = Math.max(1, Math.ceil(candidates.length / 3));
  return candidates[Math.floor(Math.random() * farthestGroupSize)].id;
}

function showPredictionCelebration() {
  const board = $('board');
  const celebration = document.createElement('div');
  celebration.className = 'prediction-celebration';
  celebration.setAttribute('role', 'status');
  celebration.setAttribute('aria-live', 'polite');
  const sparkles = Array.from({ length: 24 }, (_, i) => `<span class="sparkle" style="--x:${8 + Math.random() * 84}%;--y:${12 + Math.random() * 76}%;--delay:${i * 0.035}s;--hue:${Math.floor(Math.random() * 360)}">★</span>`).join('');
  celebration.innerHTML = `${sparkles}<div class="celebration-banner">Correct Prediction! <strong>+1</strong></div>`;
  board.appendChild(celebration);
  setTimeout(() => celebration.remove(), 1800);
}

function highlightSpace(id) {
  const space = $(`space-${id}`);
  space.classList.add('active-land');
  setTimeout(() => space.classList.remove('active-land'), 900);
}

function animateStartBonus() {
  const start = $('space-0');
  start.classList.add('start-bonus');
  setTimeout(() => start.classList.remove('start-bonus'), 1000);
}

function showFloating(message) {
  const el = $('floatingMessage');
  el.textContent = message;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
  setTimeout(() => el.classList.add('hidden'), 1400);
}

function nextTurn() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  beginTurn();
}
