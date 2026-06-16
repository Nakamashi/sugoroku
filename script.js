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

// The board is a directed graph. Each connection is a forward-only movement option.
// Branches eventually feed into larger one-way loops, so players travel around the map
// instead of bouncing backward and forward between nearby spaces.
const boardSpaces = [
  { id: 0, phrase: activityPhrases[0], x: 50, y: 88, next: [1] },
  { id: 1, phrase: activityPhrases[1], x: 35, y: 78, next: [2, 8] },
  { id: 2, phrase: activityPhrases[2], x: 20, y: 65, next: [3] },
  { id: 3, phrase: activityPhrases[3], x: 14, y: 45, next: [4, 12] },
  { id: 4, phrase: activityPhrases[4], x: 24, y: 25, next: [5] },
  { id: 5, phrase: activityPhrases[5], x: 42, y: 14, next: [6] },
  { id: 6, phrase: activityPhrases[6], x: 62, y: 16, next: [7, 15] },
  { id: 7, phrase: activityPhrases[7], x: 79, y: 28, next: [18] },
  { id: 8, phrase: activityPhrases[8], x: 50, y: 68, next: [9] },
  { id: 9, phrase: activityPhrases[9], x: 68, y: 70, next: [10, 16] },
  { id: 10, phrase: activityPhrases[10], x: 84, y: 60, next: [11] },
  { id: 11, phrase: activityPhrases[11], x: 88, y: 42, next: [18] },
  { id: 12, phrase: activityPhrases[12], x: 34, y: 47, next: [13] },
  { id: 13, phrase: activityPhrases[13], x: 50, y: 40, next: [14] },
  { id: 14, phrase: activityPhrases[14], x: 65, y: 45, next: [11, 16] },
  { id: 15, phrase: activityPhrases[15], x: 57, y: 31, next: [14] },
  { id: 16, phrase: activityPhrases[16], x: 72, y: 82, next: [17] },
  { id: 17, phrase: activityPhrases[17], x: 90, y: 82, next: [18] },
  { id: 18, phrase: activityPhrases[18], x: 78, y: 12, next: [19] },
  { id: 19, phrase: activityPhrases[19], x: 92, y: 20, next: [20] },
  { id: 20, phrase: activityPhrases[20], x: 94, y: 50, next: [21] },
  { id: 21, phrase: activityPhrases[21], x: 84, y: 90, next: [22] },
  { id: 22, phrase: activityPhrases[22], x: 62, y: 94, next: [23] },
  { id: 23, phrase: activityPhrases[23], x: 35, y: 93, next: [24] },
  { id: 24, phrase: activityPhrases[24], x: 14, y: 84, next: [0] }
];

const playerColors = ['#3578e5', '#ef476f', '#22a06b'];
let players = [];
let currentPlayerIndex = 0;
let currentPrediction = null;
let currentRoll = null;
let currentTimePhrases = [];
let controlsLocked = false;

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

$('startButton').addEventListener('click', startGame);
$('rollButton').addEventListener('click', rollDie);
$('nextTurnButton').addEventListener('click', nextTurn);
$('endGameButton').addEventListener('click', endGame);
$('newGameButton').addEventListener('click', startNewGame);

function startGame() {
  const count = Number(document.querySelector('input[name="playerCount"]:checked').value);
  players = Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    score: 0,
    position: 0,
    color: playerColors[i],
    token: `P${i + 1}`
  }));
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
    showFloating('Prediction bonus! +1');
    await sleep(700);
  }
  const startPasses = await movePlayer(player, currentRoll);
  const landed = boardSpaces[player.position];
  const landingPoints = landed.id === 0 ? 0 : 1;
  player.score += landingPoints;
  if (landingPoints) showFloating('+1 landing point');
  highlightSpace(landed.id);

  const startText = startPasses ? `, earned ${startPasses * 2} START bonus point${startPasses > 1 ? 's' : ''}` : '';
  $('turnSummary').textContent = `${player.name} rolled ${currentRoll}, predicted ${currentPrediction}, got ${bonus} bonus point${startText}, landed on “${landed.phrase}”, and earned ${landingPoints} landing point.`;
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
    updateTokens(true);
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
  board.innerHTML = '';
  boardSpaces.forEach((space) => {
    space.next.forEach((nextId) => drawConnector(space, boardSpaces[nextId]));
  });
  boardSpaces.forEach((space) => {
    const node = document.createElement('div');
    node.id = `space-${space.id}`;
    node.className = `space ${space.id === 0 ? 'start' : ''}`;
    node.style.left = `${space.x}%`;
    node.style.top = `${space.y}%`;
    node.textContent = space.id === 0 ? 'START' : space.phrase;
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
  const board = $('board');
  const connector = document.createElement('div');
  connector.className = 'connector';
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  connector.style.left = `${from.x}%`;
  connector.style.top = `${from.y}%`;
  connector.style.width = `${length}%`;
  connector.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  board.appendChild(connector);
}

function updateTokens(moving = false) {
  players.forEach((player, i) => {
    const token = $(`token-${i}`);
    if (!token) return;
    const space = boardSpaces[player.position];
    const offset = (i - 1) * 18;
    token.style.left = `calc(${space.x}% + ${offset}px)`;
    token.style.top = `calc(${space.y}% + ${offset}px)`;
    token.classList.toggle('moving', moving);
  });
  if (moving) setTimeout(() => document.querySelectorAll('.token').forEach((t) => t.classList.remove('moving')), 500);
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
