const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const state = {
  balance: 100000,
  bets: [],
  isSpinning: false,
  wheelRotation: 0,
  lastNet: 0,
  lastResultLabel: "대기 중",
};

const elements = {
  balance: document.getElementById("balance"),
  currentBet: document.getElementById("currentBet"),
  resultText: document.getElementById("resultText"),
  betAmount: document.getElementById("betAmount"),
  singleNumber: document.getElementById("singleNumber"),
  betList: document.getElementById("betList"),
  betCount: document.getElementById("betCount"),
  betChips: document.getElementById("betChips"),
  clearBets: document.getElementById("clearBets"),
  spinButton: document.getElementById("spinButton"),
  addNumberBet: document.getElementById("addNumberBet"),
  wheel: document.getElementById("wheel"),
  lastResultValue: document.getElementById("lastResultValue"),
  lastNet: document.getElementById("lastNet"),
  netStat: document.getElementById("netStat"),
};

function formatCurrency(value) {
  return `₩${value.toLocaleString("ko-KR")}`;
}

function formatSignedCurrency(value) {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
}

function getBetAmount() {
  const amount = Number(elements.betAmount.value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.floor(amount);
}

function getTotalBet() {
  return state.bets.reduce((total, bet) => total + bet.amount, 0);
}

function describeBet(bet) {
  if (bet.type === "color") return bet.value === "red" ? "레드" : "블랙";
  if (bet.type === "parity") return bet.value === "odd" ? "홀수" : "짝수";
  if (bet.type === "range") return bet.value === "low" ? "1-18" : "19-36";
  return `단일 숫자 ${bet.value}`;
}

function renderNet() {
  const text = formatSignedCurrency(state.lastNet);
  elements.lastNet.textContent = text;
  elements.netStat.classList.remove("net-win", "net-lose");
  if (state.lastNet > 0) elements.netStat.classList.add("net-win");
  if (state.lastNet < 0) elements.netStat.classList.add("net-lose");
}

function syncUi() {
  const totalBet = getTotalBet();
  elements.balance.textContent = formatCurrency(state.balance);
  elements.currentBet.textContent = formatCurrency(totalBet);
  elements.spinButton.disabled = state.isSpinning || totalBet === 0;
  elements.clearBets.disabled = state.isSpinning || totalBet === 0;
  renderNet();

  if (state.bets.length === 0) {
    elements.betCount.textContent = "0개";
    elements.betChips.innerHTML = '<span class="chip placeholder-chip">아직 베팅이 없습니다.</span>';
    if (elements.betList) elements.betList.innerHTML = '<li class="placeholder">아직 베팅이 없습니다.</li>';
    return;
  }

  elements.betCount.textContent = `${state.bets.length}개`;
  elements.betChips.innerHTML = state.bets
    .map(
      (bet) => `<span class="chip"><span>${describeBet(bet)}</span><span class="chip-amount">${formatCurrency(bet.amount)}</span></span>`
    )
    .join("");

  if (elements.betList) {
    elements.betList.innerHTML = state.bets
      .map((bet) => `<li><span>${describeBet(bet)}</span><strong>${formatCurrency(bet.amount)}</strong></li>`)
      .join("");
  }
}

function setMessage(text) {
  elements.resultText.textContent = text;
}

function canAfford(amount) {
  return getTotalBet() + amount <= state.balance;
}

function addBet(type, value) {
  if (state.isSpinning) return;
  const amount = getBetAmount();
  if (!amount) return setMessage("베팅 금액을 1,000원 이상으로 입력하세요.");
  if (!canAfford(amount)) return setMessage("잔액보다 많은 금액을 올릴 수 없습니다.");

  state.bets.push({ type, value, amount });
  setMessage(`${describeBet({ type, value })}에 ${formatCurrency(amount)} 베팅했습니다.`);
  syncUi();
}

function clearBets() {
  if (state.isSpinning) return;
  state.bets = [];
  setMessage("베팅을 모두 비웠습니다.");
  syncUi();
}

function spinResult() {
  return EUROPEAN_WHEEL_ORDER[Math.floor(Math.random() * EUROPEAN_WHEEL_ORDER.length)];
}

function isWinningBet(bet, result) {
  if (bet.type === "single") return bet.value === result;
  if (result === 0) return false;
  if (bet.type === "color") return bet.value === (RED_NUMBERS.has(result) ? "red" : "black");
  if (bet.type === "parity") return bet.value === (result % 2 === 0 ? "even" : "odd");
  if (bet.type === "range") return bet.value === (result <= 18 ? "low" : "high");
  return false;
}

function payoutFor(bet) {
  return bet.type === "single" ? bet.amount * 36 : bet.amount * 2;
}

function resultLabel(number) {
  if (number === 0) return "0 (그린)";
  return `${number} (${RED_NUMBERS.has(number) ? "레드" : "블랙"})`;
}

function animateWheel(result) {
  const slotIndex = EUROPEAN_WHEEL_ORDER.indexOf(result);
  const slice = 360 / EUROPEAN_WHEEL_ORDER.length;
  const targetAngle = slotIndex * slice;
  const extraTurns = 5 + Math.floor(Math.random() * 3);
  state.wheelRotation += extraTurns * 360 + (360 - targetAngle);
  elements.wheel.style.transform = `rotate(${state.wheelRotation}deg)`;
}

function settleBets(result) {
  const totalBet = getTotalBet();
  let winnings = 0;
  const winningBets = [];

  for (const bet of state.bets) {
    if (isWinningBet(bet, result)) {
      winnings += payoutFor(bet);
      winningBets.push(describeBet(bet));
    }
  }

  state.balance = state.balance - totalBet + winnings;
  state.lastNet = winnings - totalBet;
  state.bets = [];

  const label = resultLabel(result);
  state.lastResultLabel = label;
  elements.lastResultValue.textContent = label;

  if (winningBets.length === 0) {
    setMessage(`결과 ${label} · 적중 없음 · 순손익 ${formatSignedCurrency(state.lastNet)}`);
  } else if (state.lastNet >= 0) {
    setMessage(`결과 ${label} · 적중 ${winningBets.join(", ")} · 순손익 ${formatSignedCurrency(state.lastNet)}`);
  } else {
    setMessage(`결과 ${label} · 적중 ${winningBets.join(", ")} · 다른 베팅 포함 순손익 ${formatSignedCurrency(state.lastNet)}`);
  }

  syncUi();
}

function startSpin() {
  if (state.isSpinning || state.bets.length === 0) return;
  state.isSpinning = true;
  syncUi();
  setMessage("휠이 회전 중입니다...");
  const result = spinResult();
  animateWheel(result);
  window.setTimeout(() => {
    state.isSpinning = false;
    settleBets(result);
  }, 5000);
}

document.querySelectorAll("[data-bet-type]").forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.betType;
    const rawValue = button.dataset.betValue;
    const value = type === "single" ? Number(rawValue) : rawValue;
    addBet(type, value);
  });
});

elements.addNumberBet.addEventListener("click", () => {
  const selected = Number(elements.singleNumber.value);
  if (!Number.isInteger(selected) || selected < 0 || selected > 36) {
    return setMessage("단일 숫자는 0부터 36까지 선택할 수 있습니다.");
  }
  addBet("single", selected);
});

elements.clearBets.addEventListener("click", clearBets);
elements.spinButton.addEventListener("click", startSpin);

elements.lastResultValue.textContent = state.lastResultLabel;
syncUi();
