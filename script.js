const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const state = {
  players: [
    { name: "플레이어 1", balance: 100000, bets: [], lastNet: 0 },
    { name: "플레이어 2", balance: 100000, bets: [], lastNet: 0 },
  ],
  activePlayer: 0,
  isSpinning: false,
  wheelRotation: 0,
  lastResultLabel: "대기 중",
};

const elements = {
  balance: document.getElementById("balance"),
  currentBet: document.getElementById("currentBet"),
  resultText: document.getElementById("resultText"),
  betAmount: document.getElementById("betAmount"),
  singleNumber: document.getElementById("singleNumber"),
  betCount: document.getElementById("betCount"),
  betChips: document.getElementById("betChips"),
  clearBets: document.getElementById("clearBets"),
  switchTurn: document.getElementById("switchTurn"),
  spinButton: document.getElementById("spinButton"),
  addNumberBet: document.getElementById("addNumberBet"),
  wheel: document.getElementById("wheel"),
  wheelNumberLayer: document.getElementById("wheelNumberLayer"),
  lastResultValue: document.getElementById("lastResultValue"),
  lastNet: document.getElementById("lastNet"),
  netStat: document.getElementById("netStat"),
  activePlayerName: document.getElementById("activePlayerName"),
  betOwnerName: document.getElementById("betOwnerName"),
  playerCards: [document.getElementById("playerCard0"), document.getElementById("playerCard1")],
  playerNames: [document.getElementById("player0Name"), document.getElementById("player1Name")],
  playerBalances: [document.getElementById("player0Balance"), document.getElementById("player1Balance")],
  playerNets: [document.getElementById("player0Net"), document.getElementById("player1Net")],
};

function formatCurrency(value) {
  return `₩${value.toLocaleString("ko-KR")}`;
}

function formatSignedCurrency(value) {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
}

function currentPlayer() {
  return state.players[state.activePlayer];
}

function getBetAmount() {
  const amount = Number(elements.betAmount.value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.floor(amount);
}

function getTotalBet(player = currentPlayer()) {
  return player.bets.reduce((total, bet) => total + bet.amount, 0);
}

function describeBet(bet) {
  if (bet.type === "color") return bet.value === "red" ? "레드" : "블랙";
  if (bet.type === "parity") return bet.value === "odd" ? "홀수" : "짝수";
  if (bet.type === "range") return bet.value === "low" ? "1-18" : "19-36";
  return `단일 숫자 ${bet.value}`;
}

function renderNet() {
  const player = currentPlayer();
  const text = formatSignedCurrency(player.lastNet);
  elements.lastNet.textContent = text;
  elements.netStat.classList.remove("net-win", "net-lose");
  if (player.lastNet > 0) elements.netStat.classList.add("net-win");
  if (player.lastNet < 0) elements.netStat.classList.add("net-lose");
}

function renderPlayers() {
  state.players.forEach((player, index) => {
    elements.playerNames[index].value = player.name;
    elements.playerBalances[index].textContent = formatCurrency(player.balance);
    elements.playerNets[index].textContent = formatSignedCurrency(player.lastNet);
    elements.playerCards[index].classList.toggle("active", index === state.activePlayer);
  });
  elements.activePlayerName.textContent = currentPlayer().name;
  elements.betOwnerName.textContent = currentPlayer().name;
}

function renderWheelFace() {
  const slice = 360 / EUROPEAN_WHEEL_ORDER.length;
  const stops = [];

  EUROPEAN_WHEEL_ORDER.forEach((num, index) => {
    const color = num === 0 ? "#0e6e47" : RED_NUMBERS.has(num) ? "#c7423d" : "#111";
    const start = (index * slice).toFixed(4);
    const end = ((index + 1) * slice).toFixed(4);
    stops.push(`${color} ${start}deg ${end}deg`);
  });

  elements.wheel.style.background = `radial-gradient(circle at center, #422711 0 19%, transparent 19%), conic-gradient(from -90deg, ${stops.join(", ")})`;

  const radius = Math.max(96, Math.round(elements.wheel.clientWidth * 0.42));
  elements.wheelNumberLayer.innerHTML = "";
  EUROPEAN_WHEEL_ORDER.forEach((num, index) => {
    const angle = -90 + index * slice + slice / 2;
    const label = document.createElement("span");
    label.className = "wheel-slot-label";
    label.textContent = String(num);
    label.style.transform = `rotate(${angle}deg) translateY(-${radius}px) rotate(${90 - angle}deg)`;
    elements.wheelNumberLayer.appendChild(label);
  });
}

function syncUi() {
  const player = currentPlayer();
  const totalBet = getTotalBet(player);
  elements.balance.textContent = formatCurrency(player.balance);
  elements.currentBet.textContent = formatCurrency(totalBet);
  elements.spinButton.disabled = state.isSpinning || totalBet === 0;
  elements.clearBets.disabled = state.isSpinning || totalBet === 0;
  elements.switchTurn.disabled = state.isSpinning;

  renderPlayers();
  renderNet();

  if (player.bets.length === 0) {
    elements.betCount.textContent = "0개";
    elements.betChips.innerHTML = '<span class="chip placeholder-chip">아직 베팅이 없습니다.</span>';
    return;
  }

  elements.betCount.textContent = `${player.bets.length}개`;
  elements.betChips.innerHTML = player.bets
    .map(
      (bet) => `<span class="chip"><span>${describeBet(bet)}</span><span class="chip-amount">${formatCurrency(bet.amount)}</span></span>`
    )
    .join("");
}

function setMessage(text) {
  elements.resultText.textContent = text;
}

function canAfford(amount) {
  return getTotalBet(currentPlayer()) + amount <= currentPlayer().balance;
}

function settlePlayer(player, result) {
  const totalBet = getTotalBet(player);
  let winnings = 0;
  const winningBets = [];

  for (const bet of player.bets) {
    if (isWinningBet(bet, result)) {
      winnings += payoutFor(bet);
      winningBets.push(describeBet(bet));
    }
  }

  player.balance = player.balance - totalBet + winnings;
  player.lastNet = winnings - totalBet;
  player.bets = [];

  return {
    totalBet,
    winnings,
    winningBets,
    net: player.lastNet,
  };
}

function addBet(type, value) {
  if (state.isSpinning) return;
  const amount = getBetAmount();
  if (!amount) return setMessage("베팅 금액을 1,000원 이상으로 입력하세요.");
  if (!canAfford(amount)) return setMessage(`${currentPlayer().name} 잔액보다 많은 금액을 올릴 수 없습니다.`);

  currentPlayer().bets.push({ type, value, amount });
  setMessage(`${currentPlayer().name} → ${describeBet({ type, value })}에 ${formatCurrency(amount)} 베팅했습니다.`);
  syncUi();
}

function clearBets() {
  if (state.isSpinning) return;
  currentPlayer().bets = [];
  setMessage(`${currentPlayer().name}의 베팅을 모두 비웠습니다.`);
  syncUi();
}

function switchTurn() {
  if (state.isSpinning) return;
  state.activePlayer = state.activePlayer === 0 ? 1 : 0;
  setMessage(`이제 ${currentPlayer().name} 베팅을 편집합니다.`);
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
  const label = resultLabel(result);
  state.lastResultLabel = label;
  elements.lastResultValue.textContent = label;

  const summaries = state.players.map((player) => {
    const summary = settlePlayer(player, result);
    if (summary.winningBets.length === 0) {
      return `${player.name}: 적중 없음 (${formatSignedCurrency(summary.net)})`;
    }
    return `${player.name}: ${summary.winningBets.join(", ")} (${formatSignedCurrency(summary.net)})`;
  });

  setMessage(`결과 ${label} · ${summaries.join(" / ")}`);
  syncUi();
}

function startSpin() {
  const hasAnyBet = state.players.some((player) => player.bets.length > 0);
  if (state.isSpinning || !hasAnyBet) return;
  state.isSpinning = true;
  syncUi();
  setMessage(`모든 플레이어 베팅을 기준으로 휠이 회전 중입니다...`);
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
elements.switchTurn.addEventListener("click", switchTurn);
elements.spinButton.addEventListener("click", startSpin);
window.addEventListener("resize", renderWheelFace);

elements.playerCards.forEach((card, index) => {
  card.addEventListener("click", (event) => {
    if (event.target.tagName.toLowerCase() === "input") return;
    if (state.isSpinning) return;
    state.activePlayer = index;
    setMessage(`이제 ${currentPlayer().name} 베팅을 편집합니다.`);
    syncUi();
  });
});

elements.playerNames.forEach((input, index) => {
  input.addEventListener("input", () => {
    const value = input.value.trim();
    state.players[index].name = value || `플레이어 ${index + 1}`;
    syncUi();
  });
  input.addEventListener("click", (event) => event.stopPropagation());
});

elements.lastResultValue.textContent = state.lastResultLabel;
renderWheelFace();
syncUi();
