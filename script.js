// Edit these arrays to change classroom content.
const masterActivityPhrases = [
  'living in Kanagawa', 'making cakes', 'playing the guitar', 'studying English',
  'watching movies', 'reading books', 'cooking dinner', 'using a computer',
  'taking photos', 'playing baseball', 'drinking coffee', 'cleaning my room',
  'learning Japanese', 'listening to music', 'walking to school', 'drawing pictures',
  'working at a cafe', 'playing video games', 'practicing piano', 'writing stories',
  'waiting for a friend', 'talking on the phone', 'exercising every day',
  'visiting Yokohama', 'helping my family', 'playing basketball', 'studying math',
  'reading manga', 'watching anime', 'making breakfast', 'walking my dog',
  'playing soccer', 'taking the train', 'writing emails', 'cleaning the classroom',
  'learning kanji', 'singing songs', 'dancing with friends', 'doing homework',
  'shopping for groceries', 'riding my bike', 'playing tennis', 'painting pictures',
  'using a tablet', 'making videos', 'taking care of plants', 'speaking English',
  'playing cards', 'eating lunch with friends', 'practicing calligraphy',
  'studying science', 'reading the news', 'making origami', 'playing with my cat'
];

const allTimePhrases = [
  'for two days', 'for three days', 'for one week', 'for two weeks', 'for three weeks',
  'for one month', 'for two months', 'for six months', 'for a year', 'for a long time',
  'since yesterday', 'since last week', 'since last month', 'since last year', 'since April',
  'since 2020', 'since I was ten', 'since elementary school', 'since this morning', 'since Monday'
];

// The board is generated from this directed layout template each game. Spaces 0-13
// form the main loop, while 17-18 and 14-16 are one-way branches that rejoin later
// spaces on the main loop without cycling back into themselves.
const BONUS_SPACE_POINTS = 3;
const INITIAL_BONUS_SPACE_ID = 5;
const connectorCurves = {
  '2-3': -3,
  '3-17': 10,
  '9-10': -3,
  '12-13': -4,
  '12-14': 7,
  '16-13': 8,
  '17-18': 5,
  '18-8': -8
};
const mainPathIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const branchEntryIds = [3, 12];
const boardLayoutTemplate = [
  { id: 0, x: 14, y: 68, next: [1] },
  { id: 1, x: 10, y: 45, next: [2] },
  { id: 2, x: 12, y: 22, next: [3] },
  { id: 3, x: 28, y: 12, next: [4, 17] },
  { id: 4, x: 46, y: 12, next: [5] },
  { id: 5, x: 64, y: 12, next: [6] },
  { id: 6, x: 82, y: 18, next: [7] },
  { id: 7, x: 90, y: 40, next: [8] },
  { id: 8, x: 90, y: 64, next: [9] },
  { id: 9, x: 82, y: 86, next: [10] },
  { id: 10, x: 64, y: 88, next: [11] },
  { id: 11, x: 46, y: 88, next: [12] },
  { id: 12, x: 28, y: 88, next: [13, 14] },
  { id: 13, x: 12, y: 90, next: [0] },
  { id: 14, x: 34, y: 66, next: [15] },
  { id: 15, x: 52, y: 66, next: [16] },
  { id: 16, x: 70, y: 66, next: [13] },
  { id: 17, x: 56, y: 40, next: [18] },
  { id: 18, x: 74, y: 40, next: [8] }
];
let boardSpaces = generateBoardSpaces();

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


function generateBoardSpaces() {
  const selectedPhrases = shuffle([...masterActivityPhrases]).slice(0, boardLayoutTemplate.length - 1);
  const spacesById = new Map(boardLayoutTemplate.map((space) => [space.id, space]));
  return boardLayoutTemplate.map((space) => {
    const phrase = space.id === 0 ? 'START' : selectedPhrases.pop();
    const next = shouldShuffleBranchChoices(space) ? shuffle([...space.next]) : [...space.next];
    return { ...space, phrase, next };
  }).sort((a, b) => a.id - b.id).map((space, index) => {
    if (space.id !== index || !spacesById.has(index)) {
      throw new Error('Board layout ids must be contiguous and match their array indexes.');
    }
    return space;
  });
}

function shouldShuffleBranchChoices(space) {
  return space.next.length > 1;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

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
  boardSpaces = generateBoardSpaces();
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
  clearBranchOptions();
  $('nextTurnButton').classList.add('hidden');
  $('rollButton').disabled = true;
  updateGameInfo({ status: 'ready' });
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

function updateGameInfo(details = {}) {
  const player = players[currentPlayerIndex];
  const currentSpace = boardSpaces[player?.position ?? 0];
  const landed = details.landed || currentSpace;
  const practiceResult = landed?.phrase || 'START';
  let status = 'Choose a prediction, then roll.';
  if (details.status === 'rolling') status = 'Rolling the dice...';
  if (details.status === 'branch') status = 'Choose a path.';
  if (details.status === 'complete') status = 'Ready for the next turn.';
  $('gameInfo').innerHTML = `
    <p class="model-sentence">${practiceResult}</p>
    <p class="info-status">${status}</p>`;
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
  updateGameInfo();
}

async function rollDie() {
  if (!currentPrediction || controlsLocked) return;
  controlsLocked = true;
  $('rollButton').disabled = true;
  renderPredictionButtons();
  updateGameInfo({ status: 'rolling' });
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
  const moveResult = await movePlayer(player, currentRoll);
  const { startPasses, starBonus } = moveResult;
  const landed = boardSpaces[player.position];
  const landingPoints = landed.id === 0 ? 0 : 1;
  player.score += landingPoints;
  if (landingPoints) showFloating('+1 landing point');
  highlightSpace(landed.id);

  updateGameInfo({ status: 'complete', landed, predictionBonus: bonus, startPasses, landingPoints, starBonus });
  $('nextTurnButton').classList.remove('hidden');
  controlsLocked = true;
  renderAll();
}

async function movePlayer(player, steps) {
  let startPasses = 0;
  let starBonus = 0;
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
    starBonus += awardBonusSpace(player, boardSpaces[nextId]);
    updateTokens({ movingPlayerIndex: currentPlayerIndex });
    await sleep(700);
  }
  return { startPasses, starBonus };
}

function chooseBranch(space) {
  return new Promise((resolve) => {
    updateGameInfo({ status: 'branch' });
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
  validateBoardLayout();
  validateBoardPathLogic();
  const board = $('board');
  board.innerHTML = '<svg id="pathLayer" class="path-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrowHead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 1 1 L 7 4 L 1 7 z"></path></marker></defs></svg>';
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
  const nodePadding = 5.2;
  const startX = from.x + unitX * nodePadding;
  const startY = from.y + unitY * nodePadding;
  const endX = to.x - unitX * nodePadding;
  const endY = to.y - unitY * nodePadding;
  const curve = connectorCurves[`${from.id}-${to.id}`] || 0;
  const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  outline.setAttribute('class', 'connector-outline');
  path.setAttribute('class', 'connector');
  if (curve) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const controlX = midX + (-unitY * curve);
    const controlY = midY + (unitX * curve);
    const d = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
    outline.setAttribute('d', d);
    path.setAttribute('d', d);
  } else {
    const d = `M ${startX} ${startY} L ${endX} ${endY}`;
    outline.setAttribute('d', d);
    path.setAttribute('d', d);
  }
  pathLayer.appendChild(outline);
  pathLayer.appendChild(path);
}

function updateTokens(options = {}) {
  const movingPlayerIndex = typeof options === 'object' ? options.movingPlayerIndex : (options ? currentPlayerIndex : null);
  players.forEach((player, i) => {
    const token = $(`token-${i}`);
    if (!token) return;
    const space = boardSpaces[player.position];
    const dockOffset = [-28, 0, 28][i] || 0;
    token.style.left = `calc(${space.x}% + ${dockOffset}px)`;
    token.style.top = `calc(${space.y}% + 58px)`;
    token.classList.toggle('moving', i === movingPlayerIndex);
  });
  if (movingPlayerIndex !== null && movingPlayerIndex !== undefined) {
    setTimeout(() => $(`token-${movingPlayerIndex}`)?.classList.remove('moving'), 500);
  }
}


function validateBoardLayout() {
  const minimumDistance = 16;
  boardSpaces.forEach((space, i) => {
    if (space.x < 6 || space.x > 94 || space.y < 10 || space.y > 90) {
      console.warn(`Board space ${space.id} is close to the board edge.`);
    }
    boardSpaces.slice(i + 1).forEach((other) => {
      const distance = Math.hypot(space.x - other.x, space.y - other.y);
      if (distance < minimumDistance) {
        console.warn(`Board spaces ${space.id} and ${other.id} are too close: ${distance.toFixed(1)}%.`);
      }
    });
  });
}

function validateBoardPathLogic() {
  const mainPathOrder = new Map(mainPathIds.map((id, index) => [id, index]));
  const branchEntries = new Set(branchEntryIds);
  const mainPathSpaces = mainPathIds.map((id, index) => boardSpaces[id]?.next.includes(mainPathIds[(index + 1) % mainPathIds.length]));
  if (mainPathSpaces.some((isConnected) => !isConnected)) {
    console.warn('The main board loop is missing one or more forward connections.');
  }

  boardSpaces.forEach((space) => {
    space.next.forEach((nextId) => {
      if (!boardSpaces[nextId]) console.warn(`Board space ${space.id} points to missing space ${nextId}.`);
    });
  });

  branchEntries.forEach((entryId) => {
    const entryOrder = mainPathOrder.get(entryId);
    const branchStarts = boardSpaces[entryId].next.filter((id) => !mainPathOrder.has(id));
    branchStarts.forEach((startId) => {
      const visited = new Set();
      let currentId = startId;
      while (!mainPathOrder.has(currentId)) {
        if (visited.has(currentId)) {
          console.warn(`Branch from ${entryId} loops back to ${currentId}.`);
          return;
        }
        visited.add(currentId);
        const next = boardSpaces[currentId]?.next || [];
        if (next.length !== 1) {
          console.warn(`Branch space ${currentId} must have exactly one forward path.`);
          return;
        }
        currentId = next[0];
      }
      const rejoinOrder = mainPathOrder.get(currentId);
      if (rejoinOrder <= entryOrder && currentId !== 0) {
        console.warn(`Branch from ${entryId} rejoins at earlier main space ${currentId}.`);
      }
    });
  });
}

function boardCandidateIds() {
  return boardSpaces.map((space) => space.id).filter((id) => id !== 0);
}

function getSpaceContent(space) {
  if (space.id === 0) return 'START';
  const star = space.id === activeBonusSpaceId ? '<span class="bonus-badge" aria-label="Star bonus space">★</span>' : '';
  return `${star}<span class="space-label">${space.phrase}</span>`;
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
  const candidates = boardCandidateIds()
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
