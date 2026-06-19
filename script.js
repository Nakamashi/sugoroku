// Edit these mode configs to change classroom content. Board spaces are prompts only, not model sentences.
const grammarModes = {
  jhs2: {
    label: '2年生',
    title: 'will / be going to',
    reminder: 'Use: will / be going to',
    boardPhrases: [
      'visit my grandparents', 'study for a test', 'watch a movie', 'play soccer',
      'go shopping', 'clean my room', 'make dinner', 'practice the piano',
      'read a book', 'go to Tokyo', 'help my family', 'do my homework',
      'play basketball', 'meet my friends', 'write a letter', 'buy a new notebook',
      'cook curry', 'listen to music', 'take photos', 'ride my bike',
      'walk my dog', 'play video games', 'draw a picture', 'sing a song',
      'dance with friends', 'study English', 'study math', 'make a cake',
      'visit a museum', 'go to the library', 'clean the classroom', 'wash the dishes',
      'watch anime', 'read manga', 'practice baseball', 'play tennis',
      'go swimming', 'go camping', 'travel by train', 'call my friend',
      'send a message', 'use a computer', 'make a poster', 'prepare lunch',
      'learn a new song', 'visit a shrine', 'go to the park', 'play cards',
      'take care of my pet', 'study science'
    ],
    timePhrases: [
      'tomorrow', 'tonight', 'next week', 'next month', 'next year',
      'this weekend', 'after school', 'in two days', 'in three days', 'in two weeks',
      'during summer vacation', 'on Sunday', 'on Saturday', 'this evening', 'next Monday',
      'next Friday', 'during winter vacation', 'before dinner', 'after breakfast', 'in the morning'
    ]
  },
  jhs3: {
    label: '3年生',
    title: 'have been ~ing',
    reminder: 'Use: have been ~ing',
    boardPhrases: [
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
    ],
    timePhrases: [
      'for two days', 'for three days', 'for one week', 'for two weeks', 'for three weeks',
      'for one month', 'for two months', 'for six months', 'for a year', 'for a long time',
      'since yesterday', 'since last week', 'since last month', 'since last year', 'since April',
      'since 2020', 'since I was ten', 'since elementary school', 'since this morning', 'since Monday'
    ]
  }
};

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
const BOARD_GENERATION_ATTEMPTS = 1000;
const MIN_SPACE_DISTANCE = 10.5;
const SPACE_BOX_WIDTH_PERCENT = 10.8;
const SPACE_BOX_HEIGHT_PERCENT = 9;
const SPACE_BOX_PADDING_PERCENT = 2.5;
const CONNECTOR_SAMPLE_COUNT = 18;
const MAX_CONNECTOR_CROSSINGS = 1;
const BOARD_BOUNDS = {
  minX: SPACE_BOX_WIDTH_PERCENT / 2 + SPACE_BOX_PADDING_PERCENT,
  maxX: 100 - (SPACE_BOX_WIDTH_PERCENT / 2 + SPACE_BOX_PADDING_PERCENT),
  minY: SPACE_BOX_HEIGHT_PERCENT / 2 + SPACE_BOX_PADDING_PERCENT,
  maxY: 100 - (SPACE_BOX_HEIGHT_PERCENT / 2 + SPACE_BOX_PADDING_PERCENT)
};
let connectorCurves = {};
let mainPathIds = [];
let branchEntryIds = [];
let currentGrammarMode = null;
let boardSpaces = [];

const playerColors = ['#3578e5', '#ef476f', '#22a06b'];
let players = [];
let currentPlayerIndex = 0;
let currentPrediction = null;
let currentRoll = null;
let currentTimePhrases = [];
let controlsLocked = false;
let activeBonusSpaceId = INITIAL_BONUS_SPACE_ID;
let ceremonyBonuses = [];
let ceremonyBonusIndex = 0;
let ceremonyAnimating = false;

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DEMO_KEY_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'Enter'];
let demoKeyProgress = 0;
let demoMode = false;
let demoRunning = false;
let forcedRollQueue = [];
let demoBonusOverride = null;
let demoAdvanceResolver = null;

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => selectGrammarMode(button.dataset.mode));
});
document.addEventListener('keydown', handleDemoKeySequence);
$('backToModesButton').addEventListener('click', showModeScreen);
$('startButton').addEventListener('click', startGame);
$('rollButton').addEventListener('click', rollDie);
$('nextTurnButton').addEventListener('click', nextTurn);
$('endGameButton').addEventListener('click', endGame);
$('newGameButton').addEventListener('click', startNewGame);
$('bonusRevealButton').addEventListener('click', revealCurrentBonus);
$('demoNextButton').addEventListener('click', advanceDemoStep);
document.querySelectorAll('input[name="playerCount"]').forEach((input) => {
  input.addEventListener('change', renderNameInputs);
});
renderNameInputs();

function getCurrentModeConfig() {
  return grammarModes[currentGrammarMode] || grammarModes.jhs3;
}

function selectGrammarMode(mode) {
  if (!grammarModes[mode]) return;
  currentGrammarMode = mode;
  updateSetupText();
  $('modeScreen').classList.add('hidden');
  $('startScreen').classList.remove('hidden');
}

function showModeScreen() {
  currentGrammarMode = null;
  resetGameState();
  $('resultsSplash').classList.add('hidden');
  $('gameScreen').classList.add('hidden');
  $('startScreen').classList.add('hidden');
  $('modeScreen').classList.remove('hidden');
}

function updateSetupText() {
  const mode = getCurrentModeConfig();
  $('setupTitle').textContent = mode.title;
  $('setupReminder').textContent = `${mode.label} grammar game. ${mode.reminder}. Choose players and names, then start.`;
}

function resetGameState() {
  hideDemoCallout();
  demoMode = false;
  demoRunning = false;
  forcedRollQueue = [];
  demoBonusOverride = null;
  demoAdvanceResolver = null;
  players = [];
  currentPlayerIndex = 0;
  currentPrediction = null;
  currentRoll = null;
  currentTimePhrases = [];
  controlsLocked = false;
  activeBonusSpaceId = INITIAL_BONUS_SPACE_ID;
  ceremonyBonuses = [];
  ceremonyBonusIndex = 0;
  ceremonyAnimating = false;
  boardSpaces = [];
}

function generateBoardSpaces() {
  let lastWarnings = [];
  for (let attempt = 0; attempt < BOARD_GENERATION_ATTEMPTS; attempt += 1) {
    const branchPreference = attempt < BOARD_GENERATION_ATTEMPTS * 0.45 ? 2 : 1;
    const layout = generateBoardLayout(branchPreference);
    const selectedPhrases = shuffle([...getCurrentModeConfig().boardPhrases]).slice(0, TOTAL_PROMPT_SPACES);
    const generatedSpaces = layout.spaces.map((space) => ({
      ...space,
      phrase: space.id === 0 ? 'START' : selectedPhrases.pop(),
      next: shouldShuffleBranchChoices(space) ? shuffle([...space.next]) : [...space.next]
    })).sort((a, b) => a.id - b.id);
    connectorCurves = layout.connectorCurves;
    const validation = validateGeneratedBoard(generatedSpaces, layout.mainPathIds, layout.branchEntryIds);
    if (validation.ok) {
      connectorCurves = layout.connectorCurves;
      mainPathIds = layout.mainPathIds;
      branchEntryIds = layout.branchEntryIds;
      return generatedSpaces;
    }
    lastWarnings = validation.warnings;
  }
  if (window.location?.search.includes('debugBoard')) console.warn('Random board generation fell back to a clean readable layout.', lastWarnings.slice(0, 6));
  const fallback = createFallbackBoardLayout();
  connectorCurves = fallback.connectorCurves;
  mainPathIds = fallback.mainPathIds;
  branchEntryIds = fallback.branchEntryIds;
  const selectedPhrases = shuffle([...getCurrentModeConfig().boardPhrases]).slice(0, TOTAL_PROMPT_SPACES);
  return fallback.spaces.map((space) => ({
    ...space,
    phrase: space.id === 0 ? 'START' : selectedPhrases.pop(),
    next: shouldShuffleBranchChoices(space) ? shuffle([...space.next]) : [...space.next]
  })).sort((a, b) => a.id - b.id);
}

function generateBoardLayout(preferredBranchCount = null) {
  const mainCount = randomInt(13, 15);
  const branchSpaceCount = TOTAL_BOARD_SPACES - mainCount;
  const branchCount = preferredBranchCount ?? (branchSpaceCount >= 4 && Math.random() < 0.72 ? 2 : 1);
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
  const candidateEntries = shuffle(Array.from({ length: mainCount - 7 }, (_, index) => index + 2));
  const branches = [];
  branchLengths.forEach((length) => {
    const minimumGap = Math.min(4, mainCount - 1);
    const entryIndex = candidateEntries.find((candidate) => branches.every((branch) => Math.abs(branch.entryIndex - candidate) > 2));
    const fallbackEntry = randomInt(2, Math.max(2, mainCount - 5));
    const safeEntry = entryIndex ?? fallbackEntry;
    const maxRejoin = mainCount - 2;
    const minRejoin = Math.min(maxRejoin, safeEntry + minimumGap);
    const rejoinIndex = randomInt(minRejoin, maxRejoin);
    branches.push({
      entryIndex: safeEntry,
      rejoinIndex,
      length,
      curve: randomBetween(7, 13) * (Math.random() < 0.5 ? -1 : 1)
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
  const offset = randomBetween(18, 28) * centerDirection;
  return Array.from({ length }, (_, index) => {
    const t = (index + 1) / (length + 1);
    const arc = Math.sin(Math.PI * t);
    return clampPoint({
      x: entry.x + dx * t + normal.x * offset * arc + randomBetween(-1.5, 1.5),
      y: entry.y + dy * t + normal.y * offset * arc + randomBetween(-1.5, 1.5)
    });
  });
}

function createFallbackBoardLayout() {
  const baseMainPositions = [
    { x: 24, y: 50 },
    { x: 25, y: 22 },
    { x: 41, y: 12 },
    { x: 55, y: 13 },
    { x: 75, y: 20 },
    { x: 88, y: 38 },
    { x: 88, y: 62 },
    { x: 75, y: 81 },
    { x: 55, y: 88 },
    { x: 41, y: 88 },
    { x: 25, y: 78 },
    { x: 9, y: 65 },
    { x: 9, y: 35 }
  ];
  const baseBranchTemplates = [
    [
      { entry: 1, rejoin: 5, ids: [13, 14, 15], positions: [{ x: 37, y: 35 }, { x: 53, y: 39 }, { x: 70, y: 47 }] },
      { entry: 7, rejoin: 11, ids: [16, 17, 18], positions: [{ x: 68, y: 66 }, { x: 52, y: 68 }, { x: 36, y: 66 }] }
    ],
    [
      { entry: 2, rejoin: 6, ids: [13, 14, 15], positions: [{ x: 49, y: 30 }, { x: 66, y: 39 }, { x: 77, y: 52 }] },
      { entry: 8, rejoin: 12, ids: [16, 17, 18], positions: [{ x: 61, y: 70 }, { x: 44, y: 66 }, { x: 28, y: 58 }] }
    ]
  ];

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const mirrorX = Math.random() < 0.5;
    const mirrorY = Math.random() < 0.5;
    const nudge = { x: randomBetween(-1.2, 1.2), y: randomBetween(-1.2, 1.2) };
    const jitter = attempt < 60 ? 0.8 : 0;
    const transformPoint = (point) => clampPoint({
      x: (mirrorX ? 100 - point.x : point.x) + nudge.x + randomBetween(-jitter, jitter),
      y: (mirrorY ? 100 - point.y : point.y) + nudge.y + randomBetween(-jitter, jitter)
    });
    const mainPositions = baseMainPositions.map(transformPoint);
    const branchTemplates = baseBranchTemplates[randomInt(0, baseBranchTemplates.length - 1)];
    const mainCount = mainPositions.length;
    const mainIds = Array.from({ length: mainCount }, (_, id) => id);
    const spaces = mainIds.map((id, index) => ({
      id,
      x: mainPositions[index].x,
      y: mainPositions[index].y,
      next: [index === mainCount - 1 ? 0 : id + 1]
    }));
    branchTemplates.forEach((branch) => {
      spaces[branch.entry].next.push(branch.ids[0]);
      branch.ids.forEach((id, index) => {
        const position = transformPoint(branch.positions[index]);
        spaces.push({
          id,
          x: position.x,
          y: position.y,
          next: [index === branch.ids.length - 1 ? branch.rejoin : branch.ids[index + 1]]
        });
      });
    });
    const connectorCurveSign = mirrorX === mirrorY ? 1 : -1;
    const candidate = {
      spaces,
      mainPathIds: mainIds,
      branchEntryIds: branchTemplates.map((branch) => branch.entry),
      connectorCurves: branchTemplates.reduce((curves, branch) => {
        curves[`${branch.entry}-${branch.ids[0]}`] = 8 * connectorCurveSign;
        curves[`${branch.ids[branch.ids.length - 1]}-${branch.rejoin}`] = -5 * connectorCurveSign;
        return curves;
      }, {})
    };
    connectorCurves = candidate.connectorCurves;
    if (validateGeneratedBoard(spaces, candidate.mainPathIds, candidate.branchEntryIds).ok) return candidate;
  }

  const mainIds = Array.from({ length: baseMainPositions.length }, (_, id) => id);
  const spaces = mainIds.map((id, index) => ({
    id,
    x: baseMainPositions[index].x,
    y: baseMainPositions[index].y,
    next: [index === baseMainPositions.length - 1 ? 0 : id + 1]
  }));
  baseBranchTemplates[0].forEach((branch) => {
    spaces[branch.entry].next.push(branch.ids[0]);
    branch.ids.forEach((id, index) => {
      const position = branch.positions[index];
      spaces.push({
        id,
        x: position.x,
        y: position.y,
        next: [index === branch.ids.length - 1 ? branch.rejoin : branch.ids[index + 1]]
      });
    });
  });
  return {
    spaces,
    mainPathIds: mainIds,
    branchEntryIds: [1, 7],
    connectorCurves: { '1-13': 8, '15-5': -5, '7-16': 8, '18-11': -5 }
  };
}

function validateGeneratedBoard(spaces, generatedMainPathIds, generatedBranchEntryIds) {
  const warnings = collectBoardWarnings(spaces, generatedMainPathIds, generatedBranchEntryIds);
  return { ok: warnings.length === 0, warnings };
}

function getSpaceBounds(space, padding = 0) {
  const halfWidth = SPACE_BOX_WIDTH_PERCENT / 2 + padding;
  const halfHeight = SPACE_BOX_HEIGHT_PERCENT / 2 + padding;
  return {
    left: space.x - halfWidth,
    right: space.x + halfWidth,
    top: space.y - halfHeight,
    bottom: space.y + halfHeight
  };
}

function doBoundsOverlap(a, b, padding = 0) {
  return !(
    a.right + padding <= b.left ||
    b.right + padding <= a.left ||
    a.bottom + padding <= b.top ||
    b.bottom + padding <= a.top
  );
}

function getAllConnectors(spaces) {
  return spaces.flatMap((space) => space.next.map((nextId) => ({
    from: space,
    to: spaces[nextId],
    key: `${space.id}-${nextId}`
  }))).filter((connector) => connector.to);
}

function getConnectorSamplePoints(from, to, sampleCount = CONNECTOR_SAMPLE_COUNT) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const unitX = dx / distance;
  const unitY = dy / distance;
  const padding = Math.min(7, Math.max(5.8, distance * 0.18));
  const start = { x: from.x + unitX * padding, y: from.y + unitY * padding };
  const end = { x: to.x - unitX * padding, y: to.y - unitY * padding };
  const curve = connectorCurves[`${from.id}-${to.id}`] || 0;
  if (!curve) return [start, end];
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const control = { x: mid.x - unitY * curve, y: mid.y + unitX * curve };
  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const t = index / sampleCount;
    const oneMinusT = 1 - t;
    return {
      x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
      y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y
    };
  });
}

function pointInRect(point, rect) {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function segmentsIntersect(a, b, c, d) {
  const direction = (p, q, r) => (r.x - p.x) * (q.y - p.y) - (q.x - p.x) * (r.y - p.y);
  const onSegment = (p, q, r) => (
    Math.min(p.x, q.x) <= r.x && r.x <= Math.max(p.x, q.x) &&
    Math.min(p.y, q.y) <= r.y && r.y <= Math.max(p.y, q.y)
  );
  const d1 = direction(c, d, a);
  const d2 = direction(c, d, b);
  const d3 = direction(a, b, c);
  const d4 = direction(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (d1 === 0 && onSegment(c, d, a)) || (d2 === 0 && onSegment(c, d, b)) ||
    (d3 === 0 && onSegment(a, b, c)) || (d4 === 0 && onSegment(a, b, d));
}

function segmentIntersectsRect(p1, p2, rect) {
  if (pointInRect(p1, rect) || pointInRect(p2, rect)) return true;
  const corners = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom }
  ];
  return corners.some((corner, index) => segmentsIntersect(p1, p2, corner, corners[(index + 1) % corners.length]));
}

function pathsIntersect(pathA, pathB) {
  for (let i = 0; i < pathA.length - 1; i += 1) {
    for (let j = 0; j < pathB.length - 1; j += 1) {
      if (segmentsIntersect(pathA[i], pathA[i + 1], pathB[j], pathB[j + 1])) return true;
    }
  }
  return false;
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
      if (doBoundsOverlap(getSpaceBounds(space), getSpaceBounds(other), SPACE_BOX_PADDING_PERCENT * 0.45)) {
        warnings.push(`Space boxes overlap or are too close: ${space.id} and ${other.id}.`);
      }
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
      if (rejoinOrder - entryOrder < 4) warnings.push(`Branch from ${entryId} rejoins too soon at ${currentId}.`);
      const entry = spaces[entryId];
      const rejoin = spaces[currentId];
      const physicalDistance = Math.hypot(entry.x - rejoin.x, entry.y - rejoin.y);
      if (physicalDistance < 35) warnings.push(`Branch entry/rejoin too close: ${entryId} and ${currentId}.`);
    });
  });
  warnings.push(...collectConnectorSpaceWarnings(spaces));
  warnings.push(...collectConnectorCrossingWarnings(spaces));
  return warnings;
}

function collectConnectorSpaceWarnings(spaces) {
  const warnings = [];
  getAllConnectors(spaces).forEach((connector) => {
    const points = getConnectorSamplePoints(connector.from, connector.to);
    spaces.forEach((space) => {
      if (space.id === connector.from.id || space.id === connector.to.id) return;
      const paddedBounds = getSpaceBounds(space, SPACE_BOX_PADDING_PERCENT * 0.55);
      for (let i = 0; i < points.length - 1; i += 1) {
        if (segmentIntersectsRect(points[i], points[i + 1], paddedBounds)) {
          warnings.push(`Connector ${connector.from.id}→${connector.to.id} crosses space ${space.id}.`);
          return;
        }
      }
    });
  });
  return warnings;
}

function collectConnectorCrossingWarnings(spaces) {
  const connectors = getAllConnectors(spaces).map((connector) => ({
    ...connector,
    path: getConnectorSamplePoints(connector.from, connector.to)
  }));
  let crossings = 0;
  const warnings = [];
  connectors.forEach((first, index) => {
    connectors.slice(index + 1).forEach((second) => {
      const shared = [first.from.id, first.to.id].some((id) => id === second.from.id || id === second.to.id);
      if (shared) return;
      if (pathsIntersect(first.path, second.path)) {
        crossings += 1;
        warnings.push(`Connector ${first.from.id}→${first.to.id} crosses connector ${second.from.id}→${second.to.id}.`);
      }
    });
  });
  if (crossings > MAX_CONNECTOR_CROSSINGS) warnings.push(`Too many connector crossings: ${crossings}.`);
  return warnings;
}

function shouldShuffleBranchChoices(space) {
  return space.next.length > 1;
}

window.validateCurrentBoardVisuals = function validateCurrentBoardVisuals() {
  const warnings = collectBoardWarnings();
  return { ok: warnings.length === 0, warnings };
};

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


function createInitialPlayerStats() {
  return {
    totalDiceRoll: 0,
    spacesMoved: 0,
    turnsTaken: 0,
    correctPredictions: 0,
    startPasses: 0,
    exactStartLandings: 0,
    starBonusesCollected: 0,
    starBonusPoints: 0,
    landingPoints: 0,
    branchChoicesTaken: 0,
    uniqueSpacesVisited: [0],
    lowRolls: 0,
    highRolls: 0
  };
}

function recordUniqueSpaceVisit(player, spaceId) {
  if (!player.stats.uniqueSpacesVisited.includes(spaceId)) {
    player.stats.uniqueSpacesVisited.push(spaceId);
  }
}

function getUniqueSpaceCount(player) {
  return player.stats.uniqueSpacesVisited.length;
}

function recordDiceStats(player, roll) {
  player.stats.totalDiceRoll += roll;
  player.stats.turnsTaken += 1;
  if (roll <= 2) player.stats.lowRolls += 1;
  if (roll >= 5) player.stats.highRolls += 1;
}

function startGame() {
  if (!currentGrammarMode) return showModeScreen();
  players = [];
  currentPlayerIndex = 0;
  currentPrediction = null;
  currentRoll = null;
  currentTimePhrases = [];
  controlsLocked = false;
  ceremonyBonuses = [];
  ceremonyBonusIndex = 0;
  ceremonyAnimating = false;
  const count = Number(document.querySelector('input[name="playerCount"]:checked').value);
  const nameInputs = [...document.querySelectorAll('[data-player-name]')];
  players = Array.from({ length: count }, (_, i) => {
    const typedName = nameInputs[i]?.value.trim();
    return {
      name: typedName || `Player ${i + 1}`,
      score: 0,
      position: 0,
      color: playerColors[i],
      token: `P${i + 1}`,
      stats: createInitialPlayerStats(),
      baseScoreBeforeBonuses: 0,
      endGameBonusPoints: 0
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
  if (!demoMode && !confirm('End the game and show the results?')) return;
  startBonusCeremony();
}


function getEndGameBonusDefinitions() {
  return [
    { id: 'tiny-traveler', title: 'Tiny Traveler', subtitle: '省エネ旅人', points: 5, type: 'low', getValue: (p) => p.stats.spacesMoved, explanation: 'Fewest total spaces moved', unit: 'spaces', avoidIfAllTied: true },
    { id: 'starless-wonder', title: 'Starless Wonder', subtitle: '星なしの奇跡', points: 5, type: 'low', getValue: (p) => p.stats.starBonusesCollected, explanation: 'Fewest star bonuses collected', unit: 'stars', avoidIfAllTied: true },
    { id: 'slow-steady', title: 'Slow and Steady', subtitle: 'コツコツ名人', points: 4, type: 'low', getValue: (p) => p.stats.totalDiceRoll, explanation: 'Lowest total dice roll', unit: 'dice total', avoidIfAllTied: true },
    { id: 'small-roller', title: 'Small Roller', subtitle: '小さい目の達人', points: 4, type: 'high', getValue: (p) => p.stats.lowRolls, explanation: 'Most rolls of 1 or 2', unit: 'low rolls', avoidIfAllTied: true },
    { id: 'prediction-master', title: 'Prediction Master', subtitle: '予想名人', points: 3, type: 'high', getValue: (p) => p.stats.correctPredictions, explanation: 'Most correct dice predictions', unit: 'correct', avoidIfAllTied: true },
    { id: 'explorer', title: 'Explorer', subtitle: '冒険家', points: 3, type: 'high', getValue: getUniqueSpaceCount, explanation: 'Most unique spaces visited', unit: 'spaces', avoidIfAllTied: true },
    { id: 'start-sprinter', title: 'Start Sprinter', subtitle: 'スタート通過王', points: 3, type: 'high', getValue: (p) => p.stats.startPasses, explanation: 'Most START passes', unit: 'passes', avoidIfAllTied: true },
    { id: 'branch-boss', title: 'Branch Boss', subtitle: '分かれ道の達人', points: 2, type: 'high', getValue: (p) => p.stats.branchChoicesTaken, explanation: 'Most branch paths chosen', unit: 'branches', avoidIfAllTied: true },
    { id: 'star-hunter', title: 'Star Hunter', subtitle: 'スター集め王', points: 2, type: 'high', getValue: (p) => p.stats.starBonusesCollected, explanation: 'Most star bonuses collected', unit: 'stars', avoidIfAllTied: true },
    { id: 'big-roller', title: 'Big Roller', subtitle: '大きい目の王', points: 2, type: 'high', getValue: (p) => p.stats.highRolls, explanation: 'Most rolls of 5 or 6', unit: 'high rolls', avoidIfAllTied: true },
    { id: 'lucky-landing', title: 'Lucky Landing', subtitle: 'ラッキー着地賞', points: 2, type: 'high', getValue: (p) => p.stats.landingPoints, explanation: 'Most landing points earned', unit: 'points', avoidIfAllTied: true },
    { id: 'home-sweet-start', title: 'Home Sweet Start', subtitle: 'スタート大好き賞', points: 2, type: 'high', getValue: (p) => p.stats.exactStartLandings, explanation: 'Most exact landings on START', unit: 'landings', avoidIfAllTied: true }
  ];
}

function getBonusWinners(bonus) {
  const values = players.map((player) => ({ player, value: bonus.getValue(player) }));
  const target = bonus.type === 'low' ? Math.min(...values.map((item) => item.value)) : Math.max(...values.map((item) => item.value));
  const allTied = values.every((item) => item.value === values[0].value);
  return { winners: values.filter((item) => item.value === target).map((item) => item.player), value: target, allTied };
}

function calculateBonusCandidates() {
  return getEndGameBonusDefinitions().map((bonus) => ({ ...bonus, ...getBonusWinners(bonus) }));
}

function getEndGameBonusCount() {
  const completedFullRounds = players.length ? Math.min(...players.map((player) => player.stats.turnsTaken)) : 0;
  if (completedFullRounds >= 7) return 3;
  if (completedFullRounds >= 4) return 2;
  return players.some((player) => player.stats.turnsTaken > 0) ? 1 : 0;
}

function getCandidateBonusAward(bonus) {
  return { ...bonus, ...getBonusWinners(bonus) };
}

function getAwardWinnerIds(award) {
  return award.winners.map((winner) => players.indexOf(winner));
}

function hasConflictingBonuses(selection) {
  const ids = selection.map((bonus) => bonus.id);
  return ids.includes('starless-wonder') && ids.includes('star-hunter');
}

function scoreBonusSelection(selection, desiredCount) {
  const winnerCounts = new Map();
  selection.forEach((bonus) => {
    getAwardWinnerIds(bonus).forEach((winnerId) => {
      winnerCounts.set(winnerId, (winnerCounts.get(winnerId) || 0) + 1);
    });
  });
  const uniqueWinnerCount = winnerCounts.size;
  const maxWinnerCount = Math.max(0, ...winnerCounts.values());
  let score = selection.length * 100;
  score += uniqueWinnerCount * 45;
  if (desiredCount > 1 && uniqueWinnerCount >= 2) score += 90;
  if (desiredCount > 1 && uniqueWinnerCount < 2) score -= 140;
  score -= maxWinnerCount > 1 ? (maxWinnerCount - 1) * 35 : 0;
  score -= selection.filter((bonus) => bonus.allTied).length * 12;
  if (hasConflictingBonuses(selection)) score -= 70;
  return score;
}

function selectDiverseBonusSet(candidates, desiredCount) {
  if (desiredCount <= 0) return [];
  const usableCandidates = candidates.filter((bonus) => {
    const hasUsefulData = !bonus.allTied || !bonus.avoidIfAllTied || candidates.every((candidate) => candidate.allTied);
    return bonus.winners.length > 0 && hasUsefulData;
  });
  const pool = usableCandidates.length >= desiredCount ? usableCandidates : candidates;
  let bestSelection = [];
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const selected = [];
    shuffle([...pool]).forEach((bonus) => {
      if (selected.length >= desiredCount) return;
      const trial = [...selected, bonus];
      const duplicatedWinnerCounts = new Map();
      trial.forEach((award) => {
        getAwardWinnerIds(award).forEach((winnerId) => duplicatedWinnerCounts.set(winnerId, (duplicatedWinnerCounts.get(winnerId) || 0) + 1));
      });
      const maxWins = Math.max(0, ...duplicatedWinnerCounts.values());
      if (selected.length === desiredCount - 1 && desiredCount > 1 && maxWins >= desiredCount) return;
      if (hasConflictingBonuses(trial) && pool.length > desiredCount) return;
      selected.push(bonus);
    });
    pool.forEach((bonus) => {
      if (selected.length < desiredCount && !selected.some((item) => item.id === bonus.id)) selected.push(bonus);
    });
    const selection = selected.slice(0, desiredCount);
    const score = scoreBonusSelection(selection, desiredCount) + Math.random();
    if (score > bestScore) {
      bestScore = score;
      bestSelection = selection;
    }
  }
  return bestSelection;
}

function selectEndGameBonuses() {
  if (demoBonusOverride) return demoBonusOverride;
  const targetCount = getEndGameBonusCount();
  const candidates = calculateBonusCandidates().map(getCandidateBonusAward);
  return selectDiverseBonusSet(candidates, Math.min(targetCount, candidates.length));
}

function startBonusCeremony() {
  players.forEach((player) => {
    player.baseScoreBeforeBonuses = player.score;
    player.endGameBonusPoints = 0;
  });
  ceremonyBonuses = selectEndGameBonuses();
  ceremonyBonusIndex = 0;
  $('resultsTitle').textContent = 'Bonus Time!';
  $('resultsList').classList.add('hidden');
  $('bonusCeremony').classList.remove('hidden');
  $('bonusRevealButton').classList.remove('hidden');
  $('bonusRevealButton').textContent = ceremonyBonuses.length ? 'Reveal Bonus' : 'Show Final Results';
  $('bonusStepLabel').textContent = ceremonyBonuses.length ? `Bonus 1 of ${ceremonyBonuses.length}` : 'Final Results';
  $('bonusTitle').textContent = ceremonyBonuses.length ? 'Mystery Bonus' : 'No bonus awards';
  $('bonusSubtitle').textContent = 'ボーナスタイム！';
  $('bonusPoints').textContent = '???';
  $('bonusExplanation').textContent = ceremonyBonuses.length ? 'Press Reveal Bonus to see the first award.' : 'Great job playing!';
  $('bonusWinners').textContent = 'Who will get it?';
  renderCeremonyRanking();
  $('resultsSplash').classList.remove('hidden');
}

async function revealCurrentBonus() {
  if (ceremonyAnimating) return;
  if (ceremonyBonusIndex >= ceremonyBonuses.length) {
    showFinalResults();
    return;
  }
  const bonus = ceremonyBonuses[ceremonyBonusIndex];
  $('bonusStepLabel').textContent = `Bonus ${ceremonyBonusIndex + 1} of ${ceremonyBonuses.length}`;
  $('bonusTitle').textContent = bonus.title;
  $('bonusSubtitle').textContent = bonus.subtitle;
  $('bonusPoints').textContent = `+${bonus.points} pts`;
  $('bonusExplanation').textContent = `${bonus.explanation} (${bonus.value} ${bonus.unit})`;
  $('bonusWinners').textContent = bonus.winners.map((player) => player.name).join(' and ');
  $('bonusCard').classList.remove('bonus-pop');
  $('bonusCard').offsetHeight;
  $('bonusCard').classList.add('bonus-pop');
  const previousSnapshot = getCeremonyRankingSnapshot().map((item) => {
    const row = $('bonusRanking').querySelector(`[data-rank-key="${item.key}"]`);
    return { ...item, rowTop: row?.getBoundingClientRect().top };
  });
  ceremonyAnimating = true;
  $('bonusRevealButton').disabled = true;
  applyCeremonyBonus(bonus);
  const newSnapshot = getCeremonyRankingSnapshot();
  ceremonyBonusIndex += 1;
  renderCeremonyRanking({ previousSnapshot, newSnapshot });
  await animateCeremonyRankingChange(previousSnapshot, newSnapshot);
  $('bonusRevealButton').textContent = ceremonyBonusIndex >= ceremonyBonuses.length ? 'Show Final Results' : 'Next Bonus';
  $('bonusRevealButton').disabled = false;
  ceremonyAnimating = false;
}

function applyCeremonyBonus(bonus) {
  bonus.winners.forEach((player) => {
    player.score += bonus.points;
    player.endGameBonusPoints += bonus.points;
  });
}

function getRankingRowKey(player) {
  return `player-${players.indexOf(player)}`;
}

function getSortedCeremonyPlayers() {
  return [...players].sort((a, b) => (b.score - a.score) || (players.indexOf(a) - players.indexOf(b)));
}

function getCeremonyRankingSnapshot() {
  return getSortedCeremonyPlayers().map((player, rank) => ({
    key: getRankingRowKey(player),
    player,
    rank,
    score: player.score,
    bonus: player.endGameBonusPoints
  }));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function renderCeremonyRanking({ previousSnapshot = null, newSnapshot = null } = {}) {
  const snapshot = newSnapshot || getCeremonyRankingSnapshot();
  $('bonusRanking').innerHTML = `<h3>Live Ranking</h3>${snapshot.map((item, index) => {
    const previous = previousSnapshot?.find((oldItem) => oldItem.key === item.key);
    const movementClass = previous && previous.rank > item.rank ? ' rank-up' : previous && previous.rank < item.rank ? ' rank-down' : '';
    const startScore = previous ? previous.score : item.score;
    const startBonus = previous ? previous.bonus : item.bonus;
    return `
    <div class="bonus-rank-row${movementClass}" data-rank-key="${item.key}">
      <span>${index + 1}. ${item.player.name}</span>
      <span><span data-score-value>${startScore}</span> pts <small>(Bonus +<span data-bonus-value>${startBonus}</span>)</small></span>
    </div>`;
  }).join('')}`;
  renderScoreboard();
}

function animateNumber(element, from, to, duration, formatter = (value) => String(value)) {
  if (!element || prefersReducedMotion() || from === to) {
    if (element) element.textContent = formatter(to);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      element.textContent = formatter(Math.round(from + ((to - from) * eased)));
      if (progress < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function applyFlipAnimation(previousPositions, previousSnapshot, newSnapshot) {
  if (prefersReducedMotion()) return Promise.resolve();
  const animations = [];
  newSnapshot.forEach((item) => {
    const row = $(`bonusRanking`).querySelector(`[data-rank-key="${item.key}"]`);
    const previousTop = previousPositions.get(item.key);
    if (!row || previousTop === undefined) return;
    const deltaY = previousTop - row.getBoundingClientRect().top;
    if (deltaY === 0) return;
    row.style.transform = `translateY(${deltaY}px)`;
    row.style.transition = 'transform 0s';
    row.offsetHeight;
    animations.push(new Promise((resolve) => {
      row.style.transition = 'transform .72s cubic-bezier(.2, 1, .3, 1)';
      row.style.transform = '';
      row.addEventListener('transitionend', resolve, { once: true });
      setTimeout(resolve, 850);
    }));
  });
  return Promise.all(animations);
}

function animateCeremonyRankingChange(previousSnapshot, newSnapshot) {
  const previousPositions = new Map(previousSnapshot.map((item) => [item.key, item.rowTop]).filter((item) => item[1] !== undefined));
  if (!previousPositions.size) {
    document.querySelectorAll('[data-rank-key]').forEach((row) => previousPositions.set(row.dataset.rankKey, row.getBoundingClientRect().top));
  }
  const numberAnimations = newSnapshot.flatMap((item) => {
    const previous = previousSnapshot.find((oldItem) => oldItem.key === item.key) || item;
    const row = $('bonusRanking').querySelector(`[data-rank-key="${item.key}"]`);
    return [
      animateNumber(row?.querySelector('[data-bonus-value]'), previous.bonus, item.bonus, 720),
      animateNumber(row?.querySelector('[data-score-value]'), previous.score, item.score, 720)
    ];
  });
  const flipAnimation = applyFlipAnimation(previousPositions, previousSnapshot, newSnapshot);
  return Promise.all([...numberAnimations, flipAnimation]);
}

function showFinalResults() {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const winners = sorted.filter((p) => p.score === topScore).map((p) => p.name).join(' and ');
  $('resultsTitle').textContent = winners ? `${winners} wins!` : 'Great work!';
  $('bonusCeremony').classList.add('hidden');
  $('resultsList').classList.remove('hidden');
  $('resultsList').innerHTML = sorted.map((p, index) => `
    <div class="result-row final-result-row">
      <span>${index + 1}. ${p.name}</span>
      <span>Base: ${p.baseScoreBeforeBonuses} / Bonus: +${p.endGameBonusPoints} / Final: ${p.score} pts</span>
    </div>`).join('');
}

function startNewGame() {
  showModeScreen();
}

function beginTurn() {
  currentPrediction = null;
  currentRoll = null;
  controlsLocked = false;
  currentTimePhrases = demoMode ? ['tomorrow', 'tonight', 'next week', 'next month', 'next year', 'this weekend'] : pickSixTimePhrases();
  $('dice').textContent = '?';
  clearBranchOptions();
  $('nextTurnButton').classList.add('hidden');
  $('rollButton').disabled = true;
  updateGameInfo({ status: 'ready' });
  renderAll();
}

function pickSixTimePhrases() {
  return [...getCurrentModeConfig().timePhrases].sort(() => Math.random() - 0.5).slice(0, 6);
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
    <p class="info-status">${getCurrentModeConfig().reminder} · ${status}</p>`;
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
  currentRoll = forcedRollQueue.length ? forcedRollQueue.shift() : getAssistedDieRoll(players[currentPlayerIndex]);
  recordDiceStats(players[currentPlayerIndex], currentRoll);
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
    player.stats.correctPredictions += 1;
    showPredictionCelebration();
    await sleep(1600);
  }
  const moveResult = await movePlayer(player, currentRoll);
  const { startPasses, starBonus } = moveResult;
  const landed = boardSpaces[player.position];
  const landingPoints = landed.id === 0 ? 0 : 1;
  player.score += landingPoints;
  if (landingPoints) player.stats.landingPoints += landingPoints;
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
      player.stats.branchChoicesTaken += 1;
    }
    player.position = nextId;
    player.stats.spacesMoved += 1;
    recordUniqueSpaceVisit(player, nextId);
    if (nextId === 0) {
      startPasses += 1;
      player.stats.startPasses += 1;
      player.score += 2;
      animateStartBonus();
      showFloating('+2 START bonus');
    }
    starBonus += awardBonusSpace(player, boardSpaces[nextId]);
    updateTokens({ movingPlayerIndex: currentPlayerIndex });
    await sleep(700);
  }
  if (player.position === 0) player.stats.exactStartLandings += 1;
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
  player.stats.starBonusesCollected += 1;
  player.stats.starBonusPoints += BONUS_SPACE_POINTS;
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

function handleDemoKeySequence(event) {
  if (!$('modeScreen') || $('modeScreen').classList.contains('hidden') || demoRunning) return;
  const expected = DEMO_KEY_SEQUENCE[demoKeyProgress];
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const normalizedExpected = expected.length === 1 ? expected.toLowerCase() : expected;
  if (key === normalizedExpected) {
    demoKeyProgress += 1;
    if (demoKeyProgress === DEMO_KEY_SEQUENCE.length) {
      demoKeyProgress = 0;
      event.preventDefault();
      runSampleTurnDemo();
    }
    return;
  }
  demoKeyProgress = key === DEMO_KEY_SEQUENCE[0] ? 1 : 0;
}

function createDemoBoardSpaces() {
  mainPathIds = Array.from({ length: TOTAL_BOARD_SPACES }, (_, id) => id);
  branchEntryIds = [];
  connectorCurves = {};
  const phrases = [
    'START', 'choose a dice number', 'roll the dice', 'collect the star bonus',
    'say the sentence', 'move your token', 'watch the score', 'keep going',
    'practice English', 'cheer your friends', 'read the time phrase', 'take another turn',
    'pass START', 'try a comeback', 'win a mystery bonus', 'play again',
    'get ready', 'almost home', 'pass START now'
  ];
  return Array.from({ length: TOTAL_BOARD_SPACES }, (_, id) => {
    const angle = 210 - (id * 360 / TOTAL_BOARD_SPACES);
    const radians = angle * Math.PI / 180;
    return {
      id,
      x: 50 + 39 * Math.cos(radians),
      y: 50 - 35 * Math.sin(radians),
      phrase: phrases[id],
      next: [(id + 1) % TOTAL_BOARD_SPACES]
    };
  });
}

function createDemoPlayers() {
  return [
    {
      name: 'Teacher Demo',
      score: 0,
      position: 0,
      color: playerColors[0],
      token: 'P1',
      stats: createInitialPlayerStats(),
      baseScoreBeforeBonuses: 0,
      endGameBonusPoints: 0
    },
    {
      name: 'Comeback Kid',
      score: 0,
      position: 16,
      color: playerColors[1],
      token: 'P2',
      stats: createInitialPlayerStats(),
      baseScoreBeforeBonuses: 0,
      endGameBonusPoints: 0
    }
  ];
}

function setDemoCallout(target, label, subtext = '', buttonText = 'Next Step') {
  const overlay = $('demoOverlay');
  const targetNode = typeof target === 'string' ? document.querySelector(target) : target;
  if (!overlay || !targetNode) return;
  overlay.classList.remove('hidden');
  document.querySelectorAll('.demo-highlight').forEach((node) => node.classList.remove('demo-highlight'));
  targetNode.classList.add('demo-highlight');
  $('demoLabel').textContent = label;
  $('demoSubtext').textContent = subtext;
  $('demoNextButton').textContent = buttonText;
  $('demoNextButton').disabled = false;
}

function hideDemoCallout() {
  $('demoOverlay')?.classList.add('hidden');
  $('demoNextButton').disabled = true;
  document.querySelectorAll('.demo-highlight').forEach((node) => node.classList.remove('demo-highlight'));
  if (demoAdvanceResolver) {
    demoAdvanceResolver();
    demoAdvanceResolver = null;
  }
}

function waitForDemoAdvance() {
  $('demoNextButton').disabled = false;
  return new Promise((resolve) => {
    demoAdvanceResolver = resolve;
  });
}

function advanceDemoStep() {
  if (!demoAdvanceResolver) return;
  const resolve = demoAdvanceResolver;
  demoAdvanceResolver = null;
  $('demoNextButton').disabled = true;
  resolve();
}

async function runSampleTurnDemo() {
  demoMode = true;
  demoRunning = true;
  currentGrammarMode = 'jhs2';
  players = createDemoPlayers();
  currentPlayerIndex = 0;
  currentPrediction = null;
  currentRoll = null;
  controlsLocked = false;
  ceremonyBonuses = [];
  ceremonyBonusIndex = 0;
  ceremonyAnimating = false;
  activeBonusSpaceId = 3;
  forcedRollQueue = [3, 3];
  boardSpaces = createDemoBoardSpaces();
  demoBonusOverride = [{
    id: 'demo-comeback',
    title: 'Comeback Champion',
    subtitle: '大逆転チャンピオン',
    points: 7,
    type: 'high',
    explanation: 'Best comeback spirit',
    unit: 'demo',
    value: 1,
    winners: [players[1]],
    allTied: false
  }];
  $('modeScreen').classList.add('hidden');
  $('startScreen').classList.add('hidden');
  $('resultsSplash').classList.add('hidden');
  $('gameScreen').classList.remove('hidden');
  drawBoard();
  beginTurn();

  setDemoCallout('#predictionButtons', '1) Predict the dice roll', 'Press Next Step to select 3. The roll will match so students see the prediction bonus.');
  await waitForDemoAdvance();
  selectPrediction(3);

  setDemoCallout('#rollButton', '2) Roll the dice', 'Press Next Step to roll. The dice chooses both movement and the time phrase.');
  await waitForDemoAdvance();
  await rollDie();

  setDemoCallout('#space-3', '3) Land on the star', 'Teacher Demo got +1 for landing and +3 for the star space.');
  await waitForDemoAdvance();
  nextTurn();

  setDemoCallout('#space-0', '4) Pass START', 'Press Next Step to give Comeback Kid a turn that passes START for bonus points.');
  await waitForDemoAdvance();
  selectPrediction(3);
  await rollDie();

  setDemoCallout('#endGameButton', '5) End the game', 'Press Next Step to open results. The mystery bonus will create a comeback win.');
  await waitForDemoAdvance();
  endGame();

  setDemoCallout('#bonusRevealButton', '6) Reveal the comeback bonus', 'Press Next Step to award the mystery bonus to Comeback Kid.');
  await waitForDemoAdvance();
  await revealCurrentBonus();

  setDemoCallout('#bonusRevealButton', '7) Show final results', 'Press Next Step to see the comeback win, then return to the main screen.');
  await waitForDemoAdvance();
  await revealCurrentBonus();

  setDemoCallout('#newGameButton', '8) Back to the main screen', 'Press Finish Demo when you are ready to choose a normal game.', 'Finish Demo');
  await waitForDemoAdvance();
  hideDemoCallout();
  startNewGame();
}
