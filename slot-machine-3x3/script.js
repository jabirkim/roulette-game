const SYMBOLS = ["🍒", "🍋", "🔔", "💎", "7", "⭐", "🍀"];
const PAYOUTS = {
  "🍋": 4,
  "🍒": 6,
  "⭐": 8,
  "🔔": 10,
  "🍀": 12,
  "💎": 15,
  "7": 25,
};
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const state = {
  balance: 100000,
  bet: 5000,
  isSpinning: false,
  grid: ["🍒", "🔔", "7", "⭐", "💎", "🍋", "🍀", "7", "🍒"],
  lastNet: 0,
};

const elements = {
  balance: document.getElementById("balance"),
  betValue: document.getElementById("betValue"),
  lastNet: document.getElementById("lastNet"),
  netStat: document.getElementById("netStat"),
  betAmount: document.getElementById("betAmount"),
  spinButton: document.getElementById("spinButton"),
  resultText: document.getElementById("resultText"),
  slotGrid: document.getElementById("slotGrid"),
  slotLines: document.getElementById("slotLines"),
  fxLayer: document.getElementById("fxLayer"),
  winBurst: document.getElementById("winBurst"),
  linePreview: document.getElementById("linePreview"),
  lineCount: document.getElementById("lineCount"),
};

function formatCurrency(value) {
  return `₩${value.toLocaleString("ko-KR")}`;
}

function signedCurrency(value) {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function renderGrid() {
  const cells = elements.slotGrid.querySelectorAll(".slot-cell");
  cells.forEach((cell, index) => {
    cell.textContent = state.grid[index];
    cell.classList.remove("hit");
  });
}

function clearWinEffects() {
  elements.slotLines.innerHTML = "";
  elements.fxLayer.innerHTML = "";
  elements.winBurst.classList.add("hidden");
  elements.slotGrid.querySelectorAll(".slot-cell").forEach((cell) => cell.classList.remove("hit"));
}

function lineCenter(index) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = 50 + col * 100;
  const y = 50 + row * 100;
  return { x, y };
}

function renderWinLines(lines) {
  elements.slotLines.innerHTML = "";
  if (!lines.length) return;

  lines.forEach((line) => {
    const start = lineCenter(line[0]);
    const end = lineCenter(line[2]);
    const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineEl.setAttribute("x1", start.x);
    lineEl.setAttribute("y1", start.y);
    lineEl.setAttribute("x2", end.x);
    lineEl.setAttribute("y2", end.y);
    elements.slotLines.appendChild(lineEl);

    line.forEach((idx) => {
      const cell = elements.slotGrid.children[idx];
      if (cell) cell.classList.add("hit");
    });
  });
}

function fireConfetti() {
  const colors = ["#ff4d4d", "#ffd166", "#33d17a", "#7aa2ff", "#ff7ad9"];
  elements.fxLayer.innerHTML = "";
  for (let i = 0; i < 28; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.background = colors[i % colors.length];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${Math.random() * 20}%`;
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 180}px`);
    piece.style.setProperty("--dy", `${140 + Math.random() * 120}px`);
    elements.fxLayer.appendChild(piece);
  }
}

function playWinFanfare() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const now = ctx.currentTime;
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = index % 2 === 0 ? "triangle" : "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.08, now + index * 0.09 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + index * 0.09);
    osc.stop(now + index * 0.09 + 0.16);
  });
  setTimeout(() => ctx.close().catch(() => {}), 900);
}

function renderNet() {
  elements.lastNet.textContent = signedCurrency(state.lastNet);
  elements.netStat.classList.remove("net-win", "net-lose");
  if (state.lastNet > 0) elements.netStat.classList.add("net-win");
  if (state.lastNet < 0) elements.netStat.classList.add("net-lose");
}

function syncUi() {
  elements.balance.textContent = formatCurrency(state.balance);
  elements.betValue.textContent = formatCurrency(state.bet);
  elements.betAmount.value = state.bet;
  elements.spinButton.disabled = state.isSpinning;
  renderNet();
  renderGrid();
}

function setMessage(text) {
  elements.resultText.textContent = text;
}

function updateBet(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 1000) return;
  state.bet = Math.floor(value);
  syncUi();
}

function evaluateGrid() {
  const wins = [];
  const winLines = [];
  let payout = 0;

  LINES.forEach((line, index) => {
    const [a, b, c] = line.map((i) => state.grid[i]);
    if (a === b && b === c) {
      const mult = PAYOUTS[a] || 3;
      payout += state.bet * mult;
      wins.push(`${index + 1}번 라인 ${a} x${mult}`);
      winLines.push(line);
    }
  });

  return { payout, wins, winLines };
}

function renderWins(wins) {
  if (!wins.length) {
    elements.lineCount.textContent = "0줄";
    elements.linePreview.innerHTML = '<span class="chip placeholder-chip">아직 당첨 라인이 없습니다.</span>';
    return;
  }
  elements.lineCount.textContent = `${wins.length}줄`;
  elements.linePreview.innerHTML = wins.map((win) => `<span class="chip">${win}</span>`).join("");
}

function spin() {
  if (state.isSpinning) return;
  if (state.bet > state.balance) {
    setMessage("잔액보다 큰 금액은 베팅할 수 없습니다.");
    return;
  }

  clearWinEffects();
  state.isSpinning = true;
  setMessage("슬롯 회전 중...");
  syncUi();

  let tick = 0;
  const timer = setInterval(() => {
    state.grid = Array.from({ length: 9 }, randomSymbol);
    renderGrid();
    tick += 1;
    if (tick >= 12) {
      clearInterval(timer);
      finishSpin();
    }
  }, 90);
}

function finishSpin() {
  const { payout, wins, winLines } = evaluateGrid();
  state.balance = state.balance - state.bet + payout;
  state.lastNet = payout - state.bet;
  state.isSpinning = false;
  renderWins(wins);

  if (wins.length) {
    renderWinLines(winLines);
    fireConfetti();
    playWinFanfare();
    elements.winBurst.classList.remove("hidden");
    setTimeout(() => elements.winBurst.classList.add("hidden"), 900);
    setMessage(`당첨! ${wins.join(", ")} · 순손익 ${signedCurrency(state.lastNet)}`);
  } else {
    clearWinEffects();
    setMessage(`꽝! 순손익 ${signedCurrency(state.lastNet)}`);
  }

  syncUi();
}

document.querySelectorAll(".preset").forEach((button) => {
  button.addEventListener("click", () => updateBet(button.dataset.amount));
});

elements.betAmount.addEventListener("change", (e) => updateBet(e.target.value));
elements.spinButton.addEventListener("click", spin);

syncUi();
renderWins([]);
