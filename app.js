const puzzles = [
  {
    title: "The signal is hidden in plain sight.",
    prompt: "Restore the power pattern before the floodlights fail. Every clean circuit turns into useful scrap.",
    hint: "Some signals only appear when the circuit is allowed to rest.",
    code: "MX-21", leverTier: "LEVEL I // 5 LEVERS", label: "FLOODLIGHT GRID", target: [0, 1, 1, 0, 1], questionCount: 3
  },
  {
    title: "The radio is still whispering.",
    prompt: "Tune the relay. There may be supplies outside, but the horde can hear a bad signal too.",
    hint: "Opposites are not enemies; here, they are the intended route.",
    code: "LG-48", leverTier: "LEVEL II // 7 LEVERS", label: "RADIO RELAY", target: [1, 0, 1, 1, 0, 1, 0], questionCount: 3
  },
  {
    title: "Dawn is a rumor, not a promise.",
    prompt: "The final generator needs a steady vector. Make it count: Clockhead is almost at the gate.",
    hint: "Read from the edge inward. The center does not lead this time.",
    code: "VT-09", leverTier: "LEVEL III // 9 LEVERS", label: "DAWN VECTOR", target: [1, 1, 0, 0, 1, 0, 1, 1, 0], questionCount: 3
  },
  {
    title: "The streets are learning your name.",
    prompt: "The emergency lift is stuck below ground. Rebuild its command path before the horde surrounds the shaft.",
    hint: "The middle signals are decoys. Trust the outer sequence first.",
    code: "HR-56", leverTier: "LEVEL IV // 10 LEVERS", label: "LIFT RELAY", target: [1, 0, 1, 0, 1, 1, 0, 1, 0, 1], questionCount: 3
  },
  {
    title: "One more signal before sunrise.",
    prompt: "The last transmitter can call the convoy—but only if you stabilize every channel before Clockhead reaches the roof.",
    hint: "The signal repeats in pairs, then breaks. The final two levers are the key.",
    code: "DN-88", leverTier: "LEVEL V // 12 LEVERS", label: "DAWN TRANSMITTER", target: [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1], questionCount: 3
  }
];

const shopItems = [
  { id: "planks", icon: "▤", name: "Steel planks", description: "+30% gate integrity for tonight.", cost: 100 },
  { id: "flares", icon: "✦", name: "Decoy flares", description: "Removes one zombie before it attacks.", cost: 65 },
  { id: "nailgun", icon: "⌁", name: "Nailgun", description: "Drops two zombies with every shot.", cost: 95 },
  { id: "clockbreaker", icon: "◉", name: "Clockbreaker shells", description: "Deals double damage to Clockhead.", cost: 85 },
  { id: "arcRifle", icon: "ϟ", name: "Arc rifle", description: "Deals triple damage to Clockhead.", cost: 130 }
];

const state = {
  chamber: 0, levers: [0, 0, 0, 0, 0], attempts: 0, scrap: 0, health: 100,
  sound: true, solvedSignal: false, questionSolved: false, questionStep: 0, questionMistake: false, activeQuestions: [], questionHistory: new Set(), targetHits: 0, targetRequired: 6, targetActive: false, shopUsed: false, nightInProgress: false,
  zombies: 0, boss: 0, bossClock: 0, damage: 1, zombieDamage: 1, weaponName: "BUNKER PISTOL", nightTimer: null, battleCooldown: false
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  stage: $("#leverStage"), target: $("#targetBits"), bars: $("#signalBars"), output: $("#outputBinary"), message: $("#consoleMessage"),
  scrap: $("#scrapCount"), health: $("#healthCount"), best: $("#bestScore"), missionNumber: $("#missionNumber"), title: $("#puzzleTitle"), prompt: $("#puzzlePrompt"), hint: $("#puzzleHint"), matrix: $("#matrixId"), leverTier: $("#leverTier"), targetLabel: $("#targetLabel"),
  questionPanel: $("#questionPanel"), questionIndex: $("#questionIndex"), questionTitle: $("#questionTitle"), answers: $("#answerList"), feedback: $("#answerFeedback"), questionPoints: $("#questionPoints"),
  board: $(".game-board"), complete: $("#completePanel"), finalScore: $("#finalScore"), completeMessage: $("#completeMessage"), chamberCode: $("#chamberCode"), totalNights: $("#totalNights"), uplink: $("#uplinkStatus"), progress: $("#progressFill"), footerState: $("#footerState"), soundButton: $("#soundButton"), toast: $("#toast"),
  targetPanel: $("#targetPanel"), targetStage: $("#targetStage"), targetCounter: $("#targetCounter"), targetFeedback: $("#targetFeedback"),
  survival: $("#survivalPanel"), shopScrap: $("#shopScrap"), shopItems: $("#shopItems"), hordeCard: $(".horde-card"), hordeMessage: $("#hordeMessage"), zombiePack: $("#zombiePack"), boss: $("#bossMonster"), clockHand: $("#clockHand"), gateHealth: $("#gateHealth"), gateHealthBar: $("#gateHealthBar"), battleTip: $("#battleTip"), weaponReadout: $("#weaponReadout"), startNight: $("#startNightButton"), skipShop: $("#skipShopButton"), defend: $("#defendButton")
};

const pad = (number) => String(number).padStart(2, "0");
const money = (number) => `$${String(number).padStart(3, "0")}`;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function numberDistractors(correct) {
  const options = new Set();
  while (options.size < 3) {
    const offset = randomInt(-5, 5);
    const value = correct + (offset === 0 ? 1 : offset);
    if (value >= 0 && value !== correct) options.add(value);
  }
  return [...options];
}

function createQuestion(text, correctAnswer, wrongAnswers, explanation) {
  const answers = shuffled([String(correctAnswer), ...wrongAnswers.map(String)]);
  return { text, answers, correct: answers.indexOf(String(correctAnswer)), explanation };
}

function uniqueQuestion(factory) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const question = factory();
    if (!state.questionHistory.has(question.text)) {
      state.questionHistory.add(question.text);
      return question;
    }
  }
  state.questionHistory.clear();
  const question = factory();
  state.questionHistory.add(question.text);
  return question;
}

function buildQuestions(chamber) {
  const directions = ["north", "east", "south", "west"];
  const radioCalls = [
    { name: "SOS", code: "··· ——— ···" },
    { name: "RUN", code: "·—· ··— —·" },
    { name: "HELP", code: "···· · ·—·· ·—·· ·——·" },
    { name: "WAIT", code: "·—— ·— ·· —" }
  ];
  const factories = [
    [
      () => {
        const facing = randomInt(0, 3); const turns = randomInt(1, 3); const answer = directions[(facing + turns) % 4];
        return createQuestion(`You are facing ${directions[facing]}. After turning ${turns * 90}° right, which direction are you facing?`, answer, directions.filter((direction) => direction !== answer), `Correct. A ${turns * 90}° turn from ${directions[facing]} points ${answer}.`);
      },
      () => {
        const stored = randomInt(3, 9); const found = randomInt(2, 7); const used = randomInt(1, stored + found - 1); const answer = stored + found - used;
        return createQuestion(`The med kit has ${stored} bandages. You find ${found}, then use ${used}. How many remain?`, answer, numberDistractors(answer), `Correct. ${stored} + ${found} − ${used} leaves ${answer} bandages.`);
      },
      () => {
        const required = randomInt(6, 13); const working = randomInt(1, required - 1); const answer = required - working;
        return createQuestion(`The floodlights need ${required} power cells. You already have ${working}. How many more do you need?`, answer, numberDistractors(answer), `Correct. ${required} − ${working} means you still need ${answer} cells.`);
      }
    ],
    [
      () => {
        const signal = radioCalls[randomInt(0, radioCalls.length - 1)];
        return createQuestion(`The radio repeats ${signal.code}. Which call is it sending?`, signal.name, radioCalls.filter((call) => call.name !== signal.name).map((call) => call.name), `Correct. ${signal.code} spells ${signal.name} in Morse code.`);
      },
      () => {
        const packs = randomInt(2, 6); const cellsPerPack = randomInt(3, 6); const answer = packs * cellsPerPack;
        return createQuestion(`You salvage ${packs} battery packs with ${cellsPerPack} cells each. How many cells did you find?`, answer, numberDistractors(answer), `Correct. ${packs} packs × ${cellsPerPack} cells gives ${answer}.`);
      },
      () => {
        const scrap = randomInt(150, 260); const cost = randomInt(45, Math.min(125, scrap - 20)); const answer = scrap - cost;
        return createQuestion(`You have ${scrap} scrap and buy a supply crate for ${cost}. How much scrap remains?`, answer, numberDistractors(answer), `Correct. ${scrap} − ${cost} leaves ${answer} scrap.`);
      }
    ],
    [
      () => {
        const hour = randomInt(1, 11); const answer = Math.min(hour * 30, 360 - hour * 30);
        return createQuestion(`At exactly ${hour}:00, what is the smaller angle between the hands of an analog clock?`, `${answer}°`, numberDistractors(answer).map((value) => `${value}°`), `Correct. Each hour mark is 30°, so the smaller angle is ${answer}°.`);
      },
      () => {
        const axis = Math.random() > .5 ? "x" : "y"; const fixed = randomInt(1, 8); const start = randomInt(1, 4); const end = randomInt(start + 3, start + 8); const answer = end - start;
        const startPoint = axis === "x" ? `(${start},${fixed})` : `(${fixed},${start})`; const endPoint = axis === "x" ? `(${end},${fixed})` : `(${fixed},${end})`;
        return createQuestion(`A map marks the bunker at ${startPoint} and supplies at ${endPoint}. How many blocks away are they?`, answer, numberDistractors(answer), `Correct. Only one coordinate changes, so ${end} − ${start} is ${answer} blocks.`);
      },
      () => {
        const start = randomInt(4, 18); const step = randomInt(3, 9); const answer = start + step * 3;
        return createQuestion(`A coded relay counts ${start}, ${start + step}, ${start + step * 2}, ?. What number comes next?`, answer, numberDistractors(answer), `Correct. The relay increases by ${step} each time, so the next number is ${answer}.`);
      }
    ],
    [
      () => {
        const floor = randomInt(-6, -2); const rise = randomInt(4, 9); const answer = floor + rise;
        return createQuestion(`The emergency lift starts on floor ${floor} and rises ${rise} floors. Where does it stop?`, answer, numberDistractors(answer), `Correct. ${floor} + ${rise} puts the lift on floor ${answer}.`);
      },
      () => {
        const filters = randomInt(2, 5); const liters = randomInt(3, 8); const answer = filters * liters;
        return createQuestion(`${filters} water filters each clean ${liters} liters before sunrise. How many liters can they clean together?`, answer, numberDistractors(answer), `Correct. ${filters} filters × ${liters} liters gives ${answer} liters.`);
      },
      () => {
        const first = randomInt(4, 12); const multiplier = randomInt(2, 4); const answer = first * multiplier ** 3;
        return createQuestion(`A lift relay multiplies its reading by ${multiplier}: ${first}, ${first * multiplier}, ${first * multiplier ** 2}, ?. What comes next?`, answer, numberDistractors(answer), `Correct. Multiply ${first * multiplier ** 2} by ${multiplier} to get ${answer}.`);
      }
    ],
    [
      () => {
        const interval = randomInt(3, 8); const firstSignal = randomInt(1, 6); const count = randomInt(4, 7); const answer = firstSignal + interval * (count - 1);
        return createQuestion(`The convoy beacon flashes at minute ${firstSignal}, then every ${interval} minutes. When is flash number ${count}?`, answer, numberDistractors(answer), `Correct. After ${count - 1} intervals of ${interval} minutes, the flash is at minute ${answer}.`);
      },
      () => {
        const x = randomInt(2, 7); const y = randomInt(2, 7); const deltaX = randomInt(3, 8); const deltaY = randomInt(3, 8); const answer = deltaX + deltaY;
        return createQuestion(`The transmitter is at (${x},${y}) and the roof gate is at (${x + deltaX},${y + deltaY}). How many blocks away is it using city streets?`, answer, numberDistractors(answer), `Correct. Travel ${deltaX} blocks across and ${deltaY} blocks up: ${answer} blocks total.`);
      },
      () => {
        const teams = randomInt(3, 6); const survivors = randomInt(2, 5); const answer = teams * survivors;
        return createQuestion(`${teams} rescue teams each escort ${survivors} survivors. How many people are being escorted?`, answer, numberDistractors(answer), `Correct. ${teams} teams × ${survivors} survivors gives ${answer} people.`);
      }
    ]
  ];
  return shuffled(factories[chamber]).slice(0, puzzles[chamber].questionCount).map((factory) => uniqueQuestion(factory));
}

function playTone(kind = "flip") {
  if (!state.sound || !window.AudioContext) return;
  const Context = window.AudioContext || window.webkitAudioContext;
  const context = new Context(); const oscillator = context.createOscillator(); const gain = context.createGain();
  const tones = { flip: [260, .035], fail: [130, .11], success: [550, .18], unlock: [740, .24], shot: [410, .045] };
  const [frequency, duration] = tones[kind]; oscillator.frequency.value = frequency; oscillator.type = kind === "fail" ? "sawtooth" : "sine";
  gain.gain.setValueAtTime(.05, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration); oscillator.addEventListener("ended", () => context.close());
}

function toast(message) {
  elements.toast.textContent = message; elements.toast.classList.add("show"); clearTimeout(toast.timer);
  toast.timer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function createBits(container, values, bar = false) {
  container.replaceChildren(...values.map((value) => {
    const item = document.createElement("i"); item.className = `${bar ? "signal-bar" : "bit"}${value ? " on" : ""}`; return item;
  }));
}

function updateMeta() {
  elements.scrap.textContent = money(state.scrap); elements.health.textContent = `${Math.max(0, Math.ceil(state.health))}%`;
  elements.best.textContent = money(Math.max(state.scrap, Number(localStorage.getItem("lastlightBest") || 0)));
  elements.shopScrap.textContent = money(state.scrap);
}

function updateWeaponReadout() {
  elements.weaponReadout.textContent = `WEAPON // ${state.weaponName}`;
  elements.defend.innerHTML = `Fire ${state.weaponName.toLowerCase()} <span>⚡</span>`;
}

function renderLevers() {
  elements.stage.style.setProperty("--lever-count", state.levers.length);
  elements.stage.dataset.leverCount = state.levers.length;
  elements.stage.replaceChildren(...state.levers.map((value, index) => {
    const lever = document.createElement("button");
    lever.className = `lever${value ? " on" : ""}`; lever.type = "button"; lever.setAttribute("aria-pressed", Boolean(value));
    lever.setAttribute("aria-label", `Lever ${index + 1}, ${value ? "on" : "off"}`);
    lever.innerHTML = `<span class="lever-label">L-${pad(index + 1)}</span><span class="lever-knob"><span class="lever-handle"></span></span><span class="lever-state">${value ? "ACTIVE" : "IDLE"}</span>`;
    lever.addEventListener("click", () => {
      if (state.solvedSignal) return;
      state.levers[index] = value ? 0 : 1; renderLevers(); renderOutput(); playTone();
      elements.message.textContent = "Input adjusted. Verify when the pattern is stable."; elements.message.className = "console-message";
    });
    return lever;
  }));
}

function renderOutput() { elements.bars.style.setProperty("--lever-count", state.levers.length); createBits(elements.bars, state.levers, true); elements.output.textContent = state.levers.join(""); }

function renderQuestion() {
  const question = state.activeQuestions[state.questionStep];
  elements.questionIndex.textContent = `${pad(state.questionStep + 1)}/${state.activeQuestions.length}`; elements.questionTitle.textContent = question.text;
  state.questionMistake = false; elements.questionPoints.textContent = state.attempts <= 1 ? "80" : "60"; elements.feedback.textContent = ""; elements.feedback.className = "answer-feedback";
  elements.answers.replaceChildren(...question.answers.map((answer, index) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "answer-button";
    button.innerHTML = `<span class="answer-key">${String.fromCharCode(65 + index)}</span><span>${answer}</span>`; button.addEventListener("click", () => answerQuestion(index, button)); return button;
  }));
}

function updateProgress() {
  const checkpoints = [...document.querySelectorAll(".checkpoint")];
  checkpoints.forEach((item, index) => { item.classList.toggle("active", index === state.chamber && !state.questionSolved); item.classList.toggle("done", index < state.chamber || (index === state.chamber && state.questionSolved)); item.disabled = index > state.chamber; });
  elements.progress.style.width = `${state.chamber * (100 / (puzzles.length - 1))}%`;
}

function renderChamber() {
  const puzzle = puzzles[state.chamber];
  state.levers = Array(puzzle.target.length).fill(0); state.attempts = 0; state.solvedSignal = false; state.questionSolved = false; state.questionStep = 0; state.questionMistake = false; state.activeQuestions = buildQuestions(state.chamber); state.targetHits = 0; state.targetActive = false; state.shopUsed = false; state.nightInProgress = false; clearInterval(state.nightTimer);
  elements.missionNumber.textContent = `NIGHT ${pad(state.chamber + 1)}`; elements.title.textContent = puzzle.title; elements.prompt.textContent = puzzle.prompt; elements.hint.textContent = puzzle.hint; elements.matrix.textContent = puzzle.code; elements.leverTier.textContent = puzzle.leverTier; elements.targetLabel.textContent = puzzle.label;
  elements.chamberCode.textContent = pad(state.chamber + 1); elements.totalNights.textContent = pad(puzzles.length); elements.uplink.textContent = "GATE SEALED"; elements.questionPanel.classList.add("is-hidden"); elements.targetPanel.classList.add("is-hidden"); elements.survival.classList.add("is-hidden"); elements.board.classList.remove("board-lock");
  elements.message.textContent = "Awaiting a stable configuration."; elements.message.className = "console-message";
  createBits(elements.target, puzzle.target); renderLevers(); renderOutput(); updateMeta(); updateProgress();
}

function verifySignal() {
  if (state.solvedSignal) return;
  state.attempts += 1; const exact = state.levers.every((lever, index) => lever === puzzles[state.chamber].target[index]);
  if (!exact) {
    elements.message.textContent = "Signal mismatch — the horde hears that static."; elements.message.className = "console-message error"; playTone("fail");
  } else {
    state.solvedSignal = true; const reward = 70 + Math.max(0, 3 - state.attempts) * 20; state.scrap += reward;
    elements.message.textContent = `Power restored. +${reward} scrap. Search the cache below.`; elements.message.className = "console-message success"; elements.uplink.textContent = "POWER ONLINE";
    elements.board.classList.add("board-lock"); elements.questionPanel.classList.remove("is-hidden"); renderQuestion(); playTone("success");
    setTimeout(() => elements.questionPanel.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }
  updateMeta();
}

function answerQuestion(index, selected) {
  if (state.questionSolved) return;
  const question = state.activeQuestions[state.questionStep]; const buttons = [...elements.answers.children];
  if (index !== question.correct) {
    selected.classList.add("wrong"); selected.disabled = true; state.questionMistake = true; const halfReward = (state.attempts <= 1 ? 80 : 60) / 2;
    elements.questionPoints.textContent = halfReward; elements.feedback.textContent = `Wrong answer. The cache is damaged — recover it for half reward (${halfReward} scrap).`; elements.feedback.className = "answer-feedback wrong"; playTone("fail"); return;
  }
  buttons.forEach((button, answerIndex) => { button.disabled = true; if (answerIndex === index) button.classList.add("correct"); });
  const fullBonus = state.attempts <= 1 ? 80 : 60; const bonus = state.questionMistake ? fullBonus / 2 : fullBonus;
  state.scrap += bonus; elements.feedback.textContent = `${question.explanation} +${bonus} scrap${state.questionMistake ? " (half cache recovery)" : ""}.`; elements.feedback.className = "answer-feedback";
  updateMeta(); playTone("unlock");
  if (state.questionStep < state.activeQuestions.length - 1) {
    elements.uplink.textContent = "SECOND CACHE FOUND";
    setTimeout(() => { state.questionStep += 1; renderQuestion(); }, 950);
    return;
  }
  state.questionSolved = true; elements.uplink.textContent = "CACHE SECURED"; elements.footerState.textContent = "HOSTILES INBOUND"; updateProgress();
  setTimeout(openTargetPuzzle, 1100);
}

function renderScanTarget() {
  elements.targetStage.querySelector(".scan-target")?.remove();
  const target = document.createElement("button"); target.type = "button"; target.className = "scan-target"; target.setAttribute("aria-label", "Signal target");
  target.style.left = `${randomInt(7, 79)}%`; target.style.top = `${randomInt(16, 68)}%`;
  target.style.setProperty("--target-color", shuffled(["#d7f269", "#74efd6", "#ff9667"])[0]);
  target.addEventListener("click", acquireTarget); elements.targetStage.append(target);
}

function openTargetPuzzle() {
  state.targetHits = 0; state.targetActive = true; elements.questionPanel.classList.add("is-hidden"); elements.targetPanel.classList.remove("is-hidden");
  elements.targetCounter.textContent = `${pad(state.targetHits)} / ${pad(state.targetRequired)}`; elements.targetFeedback.textContent = "Find and click the glowing signal targets before the horde arrives."; elements.targetFeedback.className = "target-feedback";
  renderScanTarget();
  setTimeout(() => elements.targetPanel.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
}

function acquireTarget() {
  if (!state.targetActive) return;
  state.targetHits += 1; elements.targetCounter.textContent = `${pad(state.targetHits)} / ${pad(state.targetRequired)}`; playTone("shot");
  if (state.targetHits < state.targetRequired) {
    elements.targetFeedback.textContent = `Signature acquired. ${state.targetRequired - state.targetHits} targets remain.`; renderScanTarget(); return;
  }
  state.targetActive = false; elements.targetStage.querySelector(".scan-target")?.remove(); state.scrap += 100; updateMeta(); playTone("unlock");
  elements.targetFeedback.textContent = "Signal sweep complete. Cache recovered: +100 scrap."; elements.targetFeedback.className = "target-feedback success"; elements.uplink.textContent = "BONUS CACHE SECURED";
  setTimeout(openSurvival, 1100);
}

function renderShop() {
  elements.shopItems.replaceChildren(...shopItems.map((item) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "shop-item"; button.disabled = state.shopUsed || state.scrap < item.cost;
    button.dataset.item = item.id; button.innerHTML = `<span class="item-icon">${item.icon}</span><strong>${item.name}</strong><small>${item.description}</small><span class="item-cost">-${item.cost}</span>`;
    button.addEventListener("click", () => buyItem(item, button)); return button;
  }));
}

function openSurvival() {
  state.health = 100; state.zombies = 8 + state.chamber * 2; state.boss = 12 + state.chamber * 4; state.bossClock = 10 - Math.floor(state.chamber / 2); state.damage = 1; state.zombieDamage = 1; state.weaponName = "BUNKER PISTOL"; state.shopUsed = false; state.nightInProgress = false;
  elements.targetPanel.classList.add("is-hidden"); elements.survival.classList.remove("is-hidden"); elements.hordeCard.classList.remove("is-under-attack"); elements.startNight.classList.remove("is-hidden"); elements.skipShop.classList.remove("is-hidden"); elements.defend.classList.add("is-hidden");
  elements.hordeMessage.textContent = `Clockhead wakes in ${state.bossClock}s.`; elements.battleTip.textContent = `A pack of ${state.zombies} zombies is shambling toward the gate. One Clockhead is behind them.`;
  renderShop(); renderThreat(); updateMeta(); updateWeaponReadout();
  setTimeout(() => elements.survival.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
}

function buyItem(item, button) {
  if (state.shopUsed || state.scrap < item.cost) return;
  state.scrap -= item.cost; state.shopUsed = true; button.classList.add("selected");
  if (item.id === "planks") { state.health = 130; elements.battleTip.textContent = "Steel planks fitted. Gate integrity is reinforced to 130%."; }
  if (item.id === "flares") { state.zombies = Math.max(0, state.zombies - 1); elements.battleTip.textContent = "Flare thrown. One zombie staggers away from the bunker."; }
  if (item.id === "nailgun") { state.zombieDamage = 2; state.weaponName = "NAILGUN"; elements.battleTip.textContent = "Nailgun loaded. Every shot can tear through two zombies."; }
  if (item.id === "clockbreaker") { state.damage = 2; state.weaponName = "CLOCKBREAKER"; elements.battleTip.textContent = "Clockbreaker shells loaded. Clockhead will take double damage."; }
  if (item.id === "arcRifle") { state.damage = 3; state.weaponName = "ARC RIFLE"; elements.battleTip.textContent = "Arc rifle charged. Clockhead will take triple damage."; }
  renderShop(); renderThreat(); updateMeta(); updateWeaponReadout(); playTone("success"); toast(`${item.name} equipped`);
}

function renderThreat() {
  elements.zombiePack.replaceChildren(...Array.from({ length: state.zombies }, (_, index) => { const zombie = document.createElement("i"); zombie.className = "zombie"; zombie.style.marginBottom = `${index % 2 ? 0 : 3}px`; return zombie; }));
  const bossScale = Math.max(.45, state.boss / (12 + state.chamber * 4)); elements.boss.style.opacity = state.boss ? "1" : "0"; elements.boss.style.transform = `translateZ(${42 + bossScale * 34}px) scale(${.78 + bossScale * .22})`;
  const hordeAdvance = Math.max(0, 100 - state.zombies * 8); elements.zombiePack.style.transform = `translateZ(${36 + hordeAdvance * .35}px) translateX(${hordeAdvance}px)`;
  elements.gateHealth.textContent = `${Math.max(0, Math.ceil(state.health))}%`; elements.gateHealthBar.style.width = `${Math.min(100, state.health)}%`; elements.gateHealthBar.style.background = state.health <= 35 ? "var(--danger)" : state.health <= 60 ? "var(--orange)" : "var(--lime)";
  const clockLimit = 10 - Math.floor(state.chamber / 2);
  elements.clockHand.style.transform = `rotate(${Math.max(0, clockLimit - state.bossClock) * (360 / clockLimit) + 25}deg) translateY(-100%)`;
}

function startNight() {
  state.nightInProgress = true; elements.hordeCard.classList.add("is-under-attack"); elements.startNight.classList.add("is-hidden"); elements.skipShop.classList.add("is-hidden"); elements.defend.classList.remove("is-hidden");
  elements.hordeMessage.textContent = `Survive! ${state.zombies} zombies / Clockhead in ${state.bossClock}s.`; elements.battleTip.textContent = "Click DEFEND GATE or press Space. Clear zombies before Clockhead's clock reaches midnight.";
  state.nightTimer = setInterval(battleTick, 700); playTone("unlock");
}

function battleTick() {
  if (!state.nightInProgress) return;
  state.bossClock = Math.max(0, state.bossClock - .7);
  const zombieDamage = state.zombies * .62; const bossDamage = state.bossClock <= 0 && state.boss > 0 ? 4.8 + state.chamber * 1.2 : 0;
  state.health -= zombieDamage + bossDamage;
  if (state.bossClock > 0) elements.hordeMessage.textContent = `${state.zombies} zombies at the gate. Clockhead strikes in ${Math.ceil(state.bossClock)}s.`;
  else elements.hordeMessage.textContent = `CLOCKHEAD IS STRIKING! ${state.zombies} zombies remain.`;
  renderThreat(); updateMeta();
  if (state.health <= 0) loseNight();
}

function defendGate() {
  if (!state.nightInProgress || state.battleCooldown) return;
  state.battleCooldown = true; setTimeout(() => state.battleCooldown = false, 155);
  if (state.zombies > 0) { const defeated = Math.min(state.zombies, state.zombieDamage); state.zombies -= defeated; elements.battleTip.textContent = `${defeated} zombie${defeated > 1 ? "s" : ""} down. ${state.zombies} remaining before Clockhead.`; }
  else if (state.boss > 0) { state.boss = Math.max(0, state.boss - state.damage); elements.battleTip.textContent = state.boss ? `Clockhead staggers. ${state.boss} armor marks remain.` : "Clockhead falls. The night is over."; }
  renderThreat(); playTone("shot");
  if (!state.zombies && !state.boss) winNight();
}

function winNight() {
  clearInterval(state.nightTimer); state.nightInProgress = false; elements.hordeCard.classList.remove("is-under-attack"); elements.defend.classList.add("is-hidden");
  const reward = 60 + state.chamber * 20; state.scrap += reward; localStorage.setItem("lastlightBest", Math.max(state.scrap, Number(localStorage.getItem("lastlightBest") || 0)));
  elements.hordeMessage.textContent = `Night survived. +${reward} scrap salvaged.`; elements.battleTip.textContent = "The gate held. Use the quiet to prepare for the next puzzle."; elements.uplink.textContent = "NIGHT SURVIVED"; elements.footerState.textContent = "GATE HOLDING";
  updateMeta(); playTone("unlock"); setTimeout(nextChamber, 1350);
}

function loseNight() {
  clearInterval(state.nightTimer); state.nightInProgress = false; elements.hordeCard.classList.remove("is-under-attack"); elements.defend.classList.add("is-hidden"); elements.startNight.classList.remove("is-hidden"); elements.startNight.textContent = "Regroup and retry →";
  elements.skipShop.classList.add("is-hidden"); elements.hordeMessage.textContent = "The barricade broke. Clockhead found the door."; elements.battleTip.textContent = "Regrouping restores the gate, but the horde keeps its numbers. Spend scrap only if you still have it.";
  elements.uplink.textContent = "GATE BREACHED"; elements.footerState.textContent = "REGROUPING"; playTone("fail"); toast("Gate breached — try the night again");
}

function nextChamber() {
  if (state.chamber < puzzles.length - 1) { state.chamber += 1; renderChamber(); toast(`Night ${pad(state.chamber + 1)}: power the bunker`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else finishGame();
}

function finishGame() {
  elements.questionPanel.classList.add("is-hidden"); elements.targetPanel.classList.add("is-hidden"); elements.survival.classList.add("is-hidden"); elements.board.classList.add("is-hidden"); document.querySelector(".progress-track").classList.add("is-hidden"); elements.complete.classList.remove("is-hidden");
  elements.finalScore.textContent = money(state.scrap); elements.completeMessage.textContent = state.scrap >= 700 ? "You made the bunker richer and the dawn safer. Even Clockhead couldn't take it." : `${puzzles.length} nights survived. The bunker is still standing.`;
  elements.uplink.textContent = "SUNRISE"; elements.footerState.textContent = "DAWN REACHED"; localStorage.setItem("lastlightBest", Math.max(state.scrap, Number(localStorage.getItem("lastlightBest") || 0))); updateMeta(); window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetGame() {
  clearInterval(state.nightTimer); state.chamber = 0; state.scrap = 0; state.health = 100; state.questionSolved = false;
  elements.complete.classList.add("is-hidden"); elements.board.classList.remove("is-hidden"); document.querySelector(".progress-track").classList.remove("is-hidden"); elements.footerState.textContent = "GATE SEALED"; renderChamber(); toast("New survival run initialized");
}

$("#verifyButton").addEventListener("click", verifySignal);
$("#resetButton").addEventListener("click", () => { if (!state.solvedSignal) { state.levers = Array(puzzles[state.chamber].target.length).fill(0); renderLevers(); renderOutput(); playTone("flip"); elements.message.textContent = "Array returned to baseline."; } });
$("#playAgainButton").addEventListener("click", resetGame);
elements.startNight.addEventListener("click", () => { if (!state.nightInProgress && state.health <= 0) state.health = 100; startNight(); });
elements.skipShop.addEventListener("click", startNight); elements.defend.addEventListener("click", defendGate);
elements.soundButton.addEventListener("click", () => { state.sound = !state.sound; elements.soundButton.setAttribute("aria-pressed", state.sound); elements.soundButton.querySelector(".sound-icon").textContent = state.sound ? "◖))" : "◖×"; });
document.addEventListener("keydown", (event) => {
  const leverKeys = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 0: 9, q: 10, w: 11 };
  if (leverKeys[event.key.toLowerCase()] !== undefined && !state.solvedSignal) document.querySelectorAll(".lever")[leverKeys[event.key.toLowerCase()]]?.click();
  if (event.key === "Enter" && !state.solvedSignal) verifySignal();
  if (event.code === "Space" && state.nightInProgress) { event.preventDefault(); defendGate(); }
});

renderChamber();
