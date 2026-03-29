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
  });
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
  let payout = 0;

  LINES.forEach((line, index) => {
    const [a, b, c] = line.map((i) => state.grid[i]);
    if (a === b && b === c) {
      const mult = PAYOUTS[a] || 3;
      payout += state.bet * mult;
      wins.push(`${index + 1}번 라인 ${a} x${mult}`);
    }
  });

  return { payout, wins };
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
  const { payout, wins } = evaluateGrid();
  state.balance = state.balance - state.bet + payout;
  state.lastNet = payout - state.bet;
  state.isSpinning = false;
  renderWins(wins);

  if (wins.length) {
    setMessage(`당첨! ${wins.join(", ")} · 순손익 ${signedCurrency(state.lastNet)}`);
  } else {
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
