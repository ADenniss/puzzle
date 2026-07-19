const puzzles = [
  {
    title: "The signal is hidden in plain sight.",
    prompt: "Restore the power pattern before the floodlights fail. Every clean circuit turns into useful scrap.",
    hint: "Some signals only appear when the circuit is allowed to rest.",
    code: "MX-21", leverTier: "LEVEL I // 5 LEVERS", label: "FLOODLIGHT GRID", target: [0, 1, 1, 0, 1],
    questions: [
      {
        text: "A door opens only when both its sensors detect movement. Which gate describes it?",
        answers: ["OR gate", "AND gate", "NOT gate", "XOR gate"], correct: 1,
        explanation: "Correct. An AND gate returns true only when both inputs are true."
      },
      {
        text: "Which binary number is equal to the decimal number 13?",
        answers: ["1011", "1101", "1110", "1001"], correct: 1,
        explanation: "Correct. 8 + 4 + 1 gives us 13, so the code is 1101."
      }
    ]
  },
  {
    title: "The radio is still whispering.",
    prompt: "Tune the relay. There may be supplies outside, but the horde can hear a bad signal too.",
    hint: "Opposites are not enemies; here, they are the intended route.",
    code: "LG-48", leverTier: "LEVEL II // 7 LEVERS", label: "RADIO RELAY", target: [1, 0, 1, 1, 0, 1, 0],
    questions: [
      {
        text: "What comes next in the sequence: 2, 6, 12, 20, 30, ?",
        answers: ["36", "40", "42", "48"], correct: 2,
        explanation: "Correct. The differences are +4, +6, +8, +10, then +12."
      },
      {
        text: "If A is true and B is false, what does A XOR B return?",
        answers: ["True", "False", "Both values", "No value"], correct: 0,
        explanation: "Correct. XOR is true when the two inputs are different."
      }
    ]
  },
  {
    title: "Dawn is a rumor, not a promise.",
    prompt: "The final generator needs a steady vector. Make it count: Clockhead is almost at the gate.",
    hint: "Read from the edge inward. The center does not lead this time.",
    code: "VT-09", leverTier: "LEVEL III // 9 LEVERS", label: "DAWN VECTOR", target: [1, 1, 0, 0, 1, 0, 1, 1, 0],
    questions: [
      {
        text: "You have three switches. Each has two positions. How many unique configurations exist?",
        answers: ["5", "6", "8", "9"], correct: 2,
        explanation: "Correct. Each switch doubles the possibilities: 2 × 2 × 2 = 8."
      },
      {
        text: "A loop repeats a task while a condition remains true. Which structure does that describe?",
        answers: ["A variable", "A function", "A conditional loop", "A comment"], correct: 2,
        explanation: "Correct. A conditional loop keeps running until its condition changes."
      }
    ]
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
  sound: true, solvedSignal: false, questionSolved: false, questionStep: 0, shopUsed: false, nightInProgress: false,
  zombies: 0, boss: 0, bossClock: 0, damage: 1, zombieDamage: 1, weaponName: "BUNKER PISTOL", nightTimer: null, battleCooldown: false
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  stage: $("#leverStage"), target: $("#targetBits"), bars: $("#signalBars"), output: $("#outputBinary"), message: $("#consoleMessage"),
  scrap: $("#scrapCount"), health: $("#healthCount"), best: $("#bestScore"), missionNumber: $("#missionNumber"), title: $("#puzzleTitle"), prompt: $("#puzzlePrompt"), hint: $("#puzzleHint"), matrix: $("#matrixId"), leverTier: $("#leverTier"), targetLabel: $("#targetLabel"),
  questionPanel: $("#questionPanel"), questionIndex: $("#questionIndex"), questionTitle: $("#questionTitle"), answers: $("#answerList"), feedback: $("#answerFeedback"), questionPoints: $("#questionPoints"),
  board: $(".game-board"), complete: $("#completePanel"), finalScore: $("#finalScore"), completeMessage: $("#completeMessage"), chamberCode: $("#chamberCode"), uplink: $("#uplinkStatus"), progress: $("#progressFill"), footerState: $("#footerState"), soundButton: $("#soundButton"), toast: $("#toast"),
  survival: $("#survivalPanel"), shopScrap: $("#shopScrap"), shopItems: $("#shopItems"), hordeCard: $(".horde-card"), hordeMessage: $("#hordeMessage"), zombiePack: $("#zombiePack"), boss: $("#bossMonster"), clockHand: $("#clockHand"), gateHealth: $("#gateHealth"), gateHealthBar: $("#gateHealthBar"), battleTip: $("#battleTip"), weaponReadout: $("#weaponReadout"), startNight: $("#startNightButton"), skipShop: $("#skipShopButton"), defend: $("#defendButton")
};

const pad = (number) => String(number).padStart(2, "0");
const money = (number) => `$${String(number).padStart(3, "0")}`;

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
  const puzzle = puzzles[state.chamber]; const question = puzzle.questions[state.questionStep];
  elements.questionIndex.textContent = `${pad(state.questionStep + 1)}/${puzzle.questions.length}`; elements.questionTitle.textContent = question.text;
  elements.questionPoints.textContent = state.attempts <= 1 ? "75" : "55"; elements.feedback.textContent = ""; elements.feedback.className = "answer-feedback";
  elements.answers.replaceChildren(...question.answers.map((answer, index) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "answer-button";
    button.innerHTML = `<span class="answer-key">${String.fromCharCode(65 + index)}</span><span>${answer}</span>`; button.addEventListener("click", () => answerQuestion(index, button)); return button;
  }));
}

function updateProgress() {
  const checkpoints = [...document.querySelectorAll(".checkpoint")];
  checkpoints.forEach((item, index) => { item.classList.toggle("active", index === state.chamber && !state.questionSolved); item.classList.toggle("done", index < state.chamber); item.disabled = index > state.chamber; });
  elements.progress.style.width = `${state.chamber * 50}%`;
}

function renderChamber() {
  const puzzle = puzzles[state.chamber];
  state.levers = Array(puzzle.target.length).fill(0); state.attempts = 0; state.solvedSignal = false; state.questionSolved = false; state.questionStep = 0; state.shopUsed = false; state.nightInProgress = false; clearInterval(state.nightTimer);
  elements.missionNumber.textContent = `NIGHT ${pad(state.chamber + 1)}`; elements.title.textContent = puzzle.title; elements.prompt.textContent = puzzle.prompt; elements.hint.textContent = puzzle.hint; elements.matrix.textContent = puzzle.code; elements.leverTier.textContent = puzzle.leverTier; elements.targetLabel.textContent = puzzle.label;
  elements.chamberCode.textContent = pad(state.chamber + 1); elements.uplink.textContent = "GATE SEALED"; elements.questionPanel.classList.add("is-hidden"); elements.survival.classList.add("is-hidden"); elements.board.classList.remove("board-lock");
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
  const puzzle = puzzles[state.chamber]; const question = puzzle.questions[state.questionStep]; const buttons = [...elements.answers.children];
  if (index !== question.correct) {
    selected.classList.add("wrong"); selected.disabled = true; elements.feedback.textContent = "Not quite. The dead keep moving — look again."; elements.feedback.className = "answer-feedback wrong"; playTone("fail"); return;
  }
  buttons.forEach((button, answerIndex) => { button.disabled = true; if (answerIndex === index) button.classList.add("correct"); });
  const bonus = state.attempts <= 1 ? 75 : 55; state.scrap += bonus; elements.feedback.textContent = `${question.explanation} +${bonus} scrap.`; elements.feedback.className = "answer-feedback";
  updateMeta(); playTone("unlock");
  if (state.questionStep < puzzle.questions.length - 1) {
    elements.uplink.textContent = "SECOND CACHE FOUND";
    setTimeout(() => { state.questionStep += 1; renderQuestion(); }, 950);
    return;
  }
  state.questionSolved = true; elements.uplink.textContent = "CACHE SECURED"; elements.footerState.textContent = "HOSTILES INBOUND"; updateProgress();
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
  state.health = 100; state.zombies = 8 + state.chamber * 3; state.boss = 12 + state.chamber * 5; state.bossClock = 10 - state.chamber; state.damage = 1; state.zombieDamage = 1; state.weaponName = "BUNKER PISTOL"; state.shopUsed = false; state.nightInProgress = false;
  elements.survival.classList.remove("is-hidden"); elements.hordeCard.classList.remove("is-under-attack"); elements.startNight.classList.remove("is-hidden"); elements.skipShop.classList.remove("is-hidden"); elements.defend.classList.add("is-hidden");
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
  const bossScale = Math.max(.45, state.boss / (12 + state.chamber * 5)); elements.boss.style.opacity = state.boss ? "1" : "0"; elements.boss.style.transform = `translateZ(${42 + bossScale * 34}px) scale(${.78 + bossScale * .22})`;
  const hordeAdvance = Math.max(0, 100 - state.zombies * 8); elements.zombiePack.style.transform = `translateZ(${36 + hordeAdvance * .35}px) translateX(${hordeAdvance}px)`;
  elements.gateHealth.textContent = `${Math.max(0, Math.ceil(state.health))}%`; elements.gateHealthBar.style.width = `${Math.min(100, state.health)}%`; elements.gateHealthBar.style.background = state.health <= 35 ? "var(--danger)" : state.health <= 60 ? "var(--orange)" : "var(--lime)";
  const clockLimit = 10 - state.chamber;
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
  elements.questionPanel.classList.add("is-hidden"); elements.survival.classList.add("is-hidden"); elements.board.classList.add("is-hidden"); document.querySelector(".progress-track").classList.add("is-hidden"); elements.complete.classList.remove("is-hidden");
  elements.finalScore.textContent = money(state.scrap); elements.completeMessage.textContent = state.scrap >= 500 ? "You made the bunker richer and the dawn safer. Even Clockhead couldn't take it." : "Three nights survived. The bunker is still standing.";
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
  if (event.key >= "1" && event.key <= "9" && !state.solvedSignal) document.querySelectorAll(".lever")[Number(event.key) - 1]?.click();
  if (event.key === "Enter" && !state.solvedSignal) verifySignal();
  if (event.code === "Space" && state.nightInProgress) { event.preventDefault(); defendGate(); }
});

renderChamber();
