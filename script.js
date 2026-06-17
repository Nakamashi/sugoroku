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

// The board is generated each game. START always has id 0; the other
// spaces are arranged dynamically into one main loop plus one-way branches.
const TOTAL_PROMPT_SPACES = 18;
const TOTAL_BOARD_SPACES = TOTAL_PROMPT_SPACES + 1;
const BONUS_SPACE_POINTS = 3;
const INITIAL_BONUS_SPACE_ID = 5;
const LUCK_PROTECTION_THRESHOLD = 10;
const LUCK_PROTECTION_MAX_DEFICIT = 20;
const ASSISTED_DICE_WEIGHTS = [1, 1, 1, 1.15, 1.3, 1.45];
const ASSISTED_STAR_NEARBY_RANGE = { min: 1, max: 3 };
const ASSISTED_STAR_CHANCE = 0.65;
const BOARD_GENERATION_ATTEMPTS = 250;
const MIN_SPACE_DISTANCE = 10.5;
const BOARD_BOUNDS = { minX: 9, maxX: 91, minY: 12, maxY: 88 };
let connectorCurves = {};
let mainPathIds = [];
let branchEntryIds = [];
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
  for (let attempt = 0; attempt < BOARD_GENERATION_ATTEMPTS; attempt += 1) {
    const layout = generateBoardLayout();
    const selectedPhrases = shuffle([...masterActivityPhrases]).slice(0, TOTAL_PROMPT_SPACES);
    const generatedSpaces = layout.spaces.map((space) => ({
      ...space,
      phrase: space.id === 0 ? 'START' : selectedPhrases.pop(),
      next: shouldShuffleBranchChoices(space) ? shuffle([...space.next]) : [...space.next]
    })).sort((a, b) => a.id - b.id);
    const validation = validateGeneratedBoard(generatedSpaces, layout.mainPathIds, layout.branchEntryIds);
    if (validation.ok) {
      connectorCurves = layout.connectorCurves;
      mainPathIds = layout.mainPathIds;
      branchEntryIds = layout.branchEntryIds;
      return generatedSpaces;
    }
  }
  throw new Error('Could not generate a playable board layout.');
}

function generateBoardLayout() {
  const mainCount = randomInt(13, 15);
  const branchSpaceCount = TOTAL_BOARD_SPACES - mainCount;
  const branchCount = branchSpaceCount >= 4 && Math.random() < 0.72 ? 2 : 1;
  const branchLengths = splitBranchLengths(branchSpaceCount, branchCount);
  const mainIds = Array.from({ length: mainCount }, (_, id) => id);
  const mainPositions = generateMainLoopPositions(mainCount);
  const spaces = mainIds.map((id, index) => ({
    id,
    x: mainPositions[index].x,
    y: mainPositions[index].y,
    next: [index === mainCount - 1 ? 0 : id + 1]
  }));
  const connectorCurveMap = {};
  const branches = chooseBranches(mainCount, branchLengths);
  let nextBranchId = mainCount;
  const usedBranchEntryIds = [];

  branches.forEach((branch) => {
    const entryId = branch.entryIndex;
    const rejoinId = branch.rejoinIndex;
    const branchIds = Array.from({ length: branch.length }, () => nextBranchId++);
    const branchPositions = generateBranchPositions(mainPositions[entryId], mainPositions[rejoinId], branch.length);
    spaces[entryId].next.push(branchIds[0]);
    usedBranchEntryIds.push(entryId);
    branchIds.forEach((id, index) => {
      spaces.push({
        id,
        x: branchPositions[index].x,
        y: branchPositions[index].y,
        next: [index === branchIds.length - 1 ? rejoinId : branchIds[index + 1]]
      });
    });
    connectorCurveMap[`${entryId}-${branchIds[0]}`] = branch.curve;
    connectorCurveMap[`${branchIds[branchIds.length - 1]}-${rejoinId}`] = branch.curve * -0.65;
  });

  return {
    spaces,
    mainPathIds: mainIds,
    branchEntryIds: usedBranchEntryIds,
    connectorCurves: connectorCurveMap
  };
}

function splitBranchLengths(totalBranchSpaces, branchCount) {
  if (branchCount === 1) return [totalBranchSpaces];
  const first = randomInt(2, totalBranchSpaces - 2);
  return shuffle([first, totalBranchSpaces - first]);
}

function generateMainLoopPositions(count) {
  const centerX = 50 + randomBetween(-2, 2);
  const centerY = 50 + randomBetween(-1.5, 1.5);
  const radiusX = randomBetween(37, 41);
  const radiusY = randomBetween(33, 37);
  const startAngle = randomBetween(202, 218);
  return Array.from({ length: count }, (_, index) => {
    const angle = startAngle - (index * 360 / count) + randomBetween(-3.5, 3.5);
    const radians = angle * Math.PI / 180;
    return clampPoint({
      x: centerX + radiusX * Math.cos(radians),
      y: centerY - radiusY * Math.sin(radians)
    });
  });
}

function chooseBranches(mainCount, branchLengths) {
  const candidateEntries = shuffle(Array.from({ length: mainCount - 6 }, (_, index) => index + 2));
  const branches = [];
  branchLengths.forEach((length) => {
    const minimumGap = Math.min(3, mainCount - 1);
    const entryIndex = candidateEntries.find((candidate) => branches.every((branch) => Math.abs(branch.entryIndex - candidate) > 2));
    const fallbackEntry = randomInt(2, Math.max(2, mainCount - 5));
    const safeEntry = entryIndex ?? fallbackEntry;
    const maxRejoin = mainCount - 1;
    const minRejoin = Math.min(maxRejoin, safeEntry + minimumGap);
    const rejoinIndex = randomInt(minRejoin, maxRejoin);
    branches.push({
      entryIndex: safeEntry,
      rejoinIndex,
      length,
      curve: randomBetween(5, 11) * (Math.random() < 0.5 ? -1 : 1)
    });
  });
  return branches.sort((a, b) => a.entryIndex - b.entryIndex);
}

function generateBranchPositions(entry, rejoin, length) {
  const dx = rejoin.x - entry.x;
  const dy = rejoin.y - entry.y;
  const distance = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / distance, y: dx / distance };
  const midpoint = { x: (entry.x + rejoin.x) / 2, y: (entry.y + rejoin.y) / 2 };
  const centerDirection = ((50 - midpoint.x) * normal.x + (50 - midpoint.y) * normal.y) >= 0 ? 1 : -1;
  const offset = randomBetween(13, 22) * centerDirection;
  return Array.from({ length }, (_, index) => {
    const t = (index + 1) / (length + 1);
    const arc = Math.sin(Math.PI * t);
    return clampPoint({
      x: entry.x + dx * t + normal.x * offset * arc + randomBetween(-1.5, 1.5),
      y: entry.y + dy * t + normal.y * offset * arc + randomBetween(-1.5, 1.5)
    });
  });
}

function validateGeneratedBoard(spaces, generatedMainPathIds, generatedBranchEntryIds) {
  const warnings = collectBoardWarnings(spaces, generatedMainPathIds, generatedBranchEntryIds);
  return { ok: warnings.length === 0, warnings };
}

function collectBoardWarnings(spaces = boardSpaces, pathIds = mainPathIds, entryIds = branchEntryIds) {
  const warnings = [];
  if (spaces.length !== TOTAL_BOARD_SPACES) warnings.push(`Board must have ${TOTAL_BOARD_SPACES} spaces.`);
  if (spaces[0]?.id !== 0) warnings.push('START must be space 0.');
  spaces.forEach((space, index) => {
    if (space.id !== index) warnings.push(`Board space id ${space.id} does not match index ${index}.`);
    if (space.x < BOARD_BOUNDS.minX || space.x > BOARD_BOUNDS.maxX || space.y < BOARD_BOUNDS.minY || space.y > BOARD_BOUNDS.maxY) {
      warnings.push(`Board space ${space.id} is outside the safe board area.`);
    }
    spaces.slice(index + 1).forEach((other) => {
      const distance = Math.hypot(space.x - other.x, space.y - other.y);
      if (distance < MIN_SPACE_DISTANCE) warnings.push(`Board spaces ${space.id} and ${other.id} are too close: ${distance.toFixed(1)}%.`);
    });
    space.next.forEach((nextId) => {
      if (!spaces[nextId]) warnings.push(`Board space ${space.id} points to missing space ${nextId}.`);
    });
  });

  const mainPathOrder = new Map(pathIds.map((id, index) => [id, index]));
  pathIds.forEach((id, index) => {
    const nextMainId = pathIds[(index + 1) % pathIds.length];
    if (!spaces[id]?.next.includes(nextMainId)) warnings.push(`Main path space ${id} is missing forward link to ${nextMainId}.`);
  });
  entryIds.forEach((entryId) => {
    const entryOrder = mainPathOrder.get(entryId);
    const branchStarts = spaces[entryId].next.filter((id) => !mainPathOrder.has(id));
    if (!branchStarts.length) warnings.push(`Branch entry ${entryId} has no branch path.`);
    branchStarts.forEach((startId) => {
      const visited = new Set();
      let currentId = startId;
      while (!mainPathOrder.has(currentId)) {
        if (visited.has(currentId)) {
          warnings.push(`Branch from ${entryId} loops back to ${currentId}.`);
          return;
        }
        visited.add(currentId);
        const next = spaces[currentId]?.next || [];
        if (next.length !== 1) {
          warnings.push(`Branch space ${currentId} must have exactly one forward path.`);
          return;
        }
        currentId = next[0];
      }
      const rejoinOrder = mainPathOrder.get(currentId);
      if (rejoinOrder <= entryOrder && currentId !== 0) warnings.push(`Branch from ${entryId} rejoins at earlier main space ${currentId}.`);
    });
  });
  return warnings;
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

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clampPoint(point) {
  return {
    x: Math.min(BOARD_BOUNDS.maxX, Math.max(BOARD_BOUNDS.minX, point.x)),
    y: Math.min(BOARD_BOUNDS.maxY, Math.max(BOARD_BOUNDS.minY, point.y))
  };
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
  currentRoll = getAssistedDieRoll(players[currentPlayerIndex]);
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
  collectBoardWarnings().forEach((warning) => console.warn(warning));
}

function validateBoardPathLogic() {
  collectBoardWarnings().forEach((warning) => console.warn(warning));
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

function getLeaderScore() {
  if (!players.length) return 0;
  return Math.max(...players.map((player) => player.score));
}

function getScoreDeficit(player) {
  if (!player) return 0;
  return Math.max(0, getLeaderScore() - player.score);
}

function getLuckProtectionLevel(player) {
  const deficit = getScoreDeficit(player);
  if (deficit < LUCK_PROTECTION_THRESHOLD) return 0;
  const protectedRange = LUCK_PROTECTION_MAX_DEFICIT - LUCK_PROTECTION_THRESHOLD;
  if (protectedRange <= 0) return 1;
  const cappedDeficit = Math.min(deficit, LUCK_PROTECTION_MAX_DEFICIT);
  return 0.25 + ((cappedDeficit - LUCK_PROTECTION_THRESHOLD) / protectedRange) * 0.75;
}

function isPlayerBehindEnoughForLuckProtection(player) {
  return getScoreDeficit(player) >= LUCK_PROTECTION_THRESHOLD;
}

function weightedRandomDie(weights) {
  const totalWeight = weights.reduce((total, weight) => total + Math.max(0, weight), 0);
  if (totalWeight <= 0) return Math.ceil(Math.random() * 6);
  let pick = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i += 1) {
    pick -= Math.max(0, weights[i]);
    if (pick <= 0) return i + 1;
  }
  return 6;
}

function getAssistedDieRoll(player) {
  const normalWeights = [1, 1, 1, 1, 1, 1];
  const level = getLuckProtectionLevel(player);
  if (!level) return weightedRandomDie(normalWeights);
  const weights = normalWeights.map((weight, index) => (
    weight + ((ASSISTED_DICE_WEIGHTS[index] ?? weight) - weight) * level
  ));
  return weightedRandomDie(weights);
}

function findSpacesAhead(startId, minSteps, maxSteps) {
  const found = new Set();
  const queue = [{ id: startId, steps: 0 }];
  const visited = new Set([`${startId}:0`]);

  while (queue.length) {
    const { id, steps } = queue.shift();
    if (steps >= maxSteps) continue;
    const space = boardSpaces[id];
    if (!space) continue;
    space.next.forEach((nextId) => {
      const nextSteps = steps + 1;
      const stateKey = `${nextId}:${nextSteps}`;
      if (visited.has(stateKey)) return;
      visited.add(stateKey);
      if (nextSteps >= minSteps && nextSteps <= maxSteps) found.add(nextId);
      if (nextSteps < maxSteps) queue.push({ id: nextId, steps: nextSteps });
    });
  }

  return [...found];
}

function pickAssistedBonusSpaceForPlayer(player, previousId) {
  const occupiedIds = new Set(players.map((currentPlayer) => currentPlayer.position));
  const candidates = findSpacesAhead(
    player.position,
    ASSISTED_STAR_NEARBY_RANGE.min,
    ASSISTED_STAR_NEARBY_RANGE.max
  ).filter((id) => id !== 0 && id !== previousId && !occupiedIds.has(id));

  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
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
  const assistedPlayers = players
    .filter(isPlayerBehindEnoughForLuckProtection)
    .sort((a, b) => getScoreDeficit(b) - getScoreDeficit(a));

  if (assistedPlayers.length && Math.random() < ASSISTED_STAR_CHANCE) {
    const assistedSpaceId = pickAssistedBonusSpaceForPlayer(assistedPlayers[0], previousId);
    if (assistedSpaceId !== null) return assistedSpaceId;
  }

  return pickFarBonusSpace(previousId);
}

function pickFarBonusSpace(previousId) {
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
