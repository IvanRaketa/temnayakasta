const SAVE_KEY = "minimarket24-save-v1";

const upgrades = [
  {
    id: "shelf2",
    title: "Полка со снеками",
    description: "Открывает второй отдел и добавляет +8 ₽ к заказу.",
    baseCost: 90,
    maxLevel: 1,
  },
  {
    id: "shelf3",
    title: "Фруктовый отдел",
    description: "Открывает третий отдел и добавляет +14 ₽ к заказу.",
    baseCost: 240,
    maxLevel: 1,
  },
  {
    id: "cashier",
    title: "Быстрая касса",
    description: "Каждый уровень добавляет +6 ₽ к заказу.",
    baseCost: 70,
    maxLevel: 5,
  },
  {
    id: "stock",
    title: "Большой склад",
    description: "Увеличивает запас товара на +4 за уровень.",
    baseCost: 55,
    maxLevel: 5,
  },
  {
    id: "reputation",
    title: "Чистый зал",
    description: "Поднимает репутацию и ускоряет развитие дней.",
    baseCost: 110,
    maxLevel: 5,
  },
  {
    id: "delivery",
    title: "Доставка",
    description: "Каждый новый день приносит стартовый бонус.",
    baseCost: 180,
    maxLevel: 4,
  },
];

const defaultState = {
  money: 60,
  reputation: 1,
  day: 1,
  ordersToday: 0,
  stock: 5,
  upgradeLevels: {
    shelf2: 0,
    shelf3: 0,
    cashier: 0,
    stock: 0,
    reputation: 0,
    delivery: 0,
  },
};

let ysdk = null;
let state = loadState();

const ui = {
  moneyValue: document.getElementById("moneyValue"),
  reputationValue: document.getElementById("reputationValue"),
  dayValue: document.getElementById("dayValue"),
  levelValue: document.getElementById("levelValue"),
  statusText: document.getElementById("statusText"),
  serveButton: document.getElementById("serveButton"),
  serveIncomeText: document.getElementById("serveIncomeText"),
  stockButton: document.getElementById("stockButton"),
  stockText: document.getElementById("stockText"),
  upgradeList: document.getElementById("upgradeList"),
  ordersProgressText: document.getElementById("ordersProgressText"),
  ordersProgressBar: document.getElementById("ordersProgressBar"),
  resetButton: document.getElementById("resetButton"),
  customer: document.getElementById("customer"),
  shelfTwo: document.getElementById("shelfTwo"),
  shelfThree: document.getElementById("shelfThree"),
  missionText: document.getElementById("missionText"),
};

initYandexSdk();
render();

ui.serveButton.addEventListener("click", serveCustomer);
ui.stockButton.addEventListener("click", restock);
ui.resetButton.addEventListener("click", resetGame);

document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveState();
});

async function initYandexSdk() {
  try {
    if (typeof YaGames === "undefined") {
      console.info("Yandex Games SDK is not available outside the platform.");
      return;
    }

    ysdk = await YaGames.init();
    ysdk?.features?.LoadingAPI?.ready?.();
  } catch (error) {
    console.warn("Yandex Games SDK init failed:", error);
  }
}

function serveCustomer() {
  if (state.stock <= 0) {
    setStatus("Товар закончился. Сначала разложи новую партию.");
    pulse(ui.stockButton);
    return;
  }

  const income = getIncomePerOrder();
  state.stock -= 1;
  state.money += income;
  state.ordersToday += 1;

  animateCustomer();

  if (state.ordersToday >= getOrdersGoal()) {
    nextDay();
  } else {
    setStatus(`Покупатель доволен. Получено ${formatMoney(income)}.`);
  }

  saveState();
  render();
}

function restock() {
  const maxStock = getMaxStock();
  if (state.stock >= maxStock) {
    setStatus("Склад уже заполнен. Обслуживай покупателей.");
    return;
  }

  const added = Math.min(5, maxStock - state.stock);
  state.stock += added;
  setStatus(`Разложено товаров: +${added}.`);
  saveState();
  render();
}

function buyUpgrade(id) {
  const upgrade = upgrades.find((item) => item.id === id);
  if (!upgrade) return;

  const level = state.upgradeLevels[id] ?? 0;
  if (level >= upgrade.maxLevel) return;

  const cost = getUpgradeCost(upgrade, level);
  if (state.money < cost) {
    setStatus("Не хватает денег на улучшение.");
    return;
  }

  state.money -= cost;
  state.upgradeLevels[id] = level + 1;

  if (id === "reputation") {
    state.reputation += 1;
  }

  setStatus(`Улучшение куплено: ${upgrade.title}.`);
  saveState();
  render();
}

function nextDay() {
  const deliveryBonus = state.upgradeLevels.delivery * 24;
  state.day += 1;
  state.ordersToday = 0;
  state.stock = Math.min(getMaxStock(), state.stock + 4 + state.upgradeLevels.delivery);
  state.money += deliveryBonus;
  state.reputation += state.day % 2 === 0 ? 1 : 0;

  const bonusText = deliveryBonus > 0 ? ` Бонус доставки: ${formatMoney(deliveryBonus)}.` : "";
  setStatus(`Новый день! Магазин становится популярнее.${bonusText}`);
}

function getIncomePerOrder() {
  return 10
    + state.upgradeLevels.cashier * 6
    + state.upgradeLevels.shelf2 * 8
    + state.upgradeLevels.shelf3 * 14
    + Math.floor(state.reputation / 2);
}

function getMaxStock() {
  return 5 + state.upgradeLevels.stock * 4;
}

function getOrdersGoal() {
  return Math.max(8, 8 + state.day + Math.max(0, 3 - state.upgradeLevels.reputation));
}

function getStoreLevel() {
  const upgradePoints = Object.values(state.upgradeLevels).reduce((sum, value) => sum + value, 0);
  return Math.min(6, 1 + Math.floor(upgradePoints / 3));
}

function getUpgradeCost(upgrade, level) {
  return Math.floor(upgrade.baseCost * Math.pow(1.55, level));
}

function render() {
  const goal = getOrdersGoal();
  const progress = Math.min(100, Math.round((state.ordersToday / goal) * 100));
  const level = getStoreLevel();

  ui.moneyValue.textContent = formatMoney(state.money);
  ui.reputationValue.textContent = String(state.reputation);
  ui.dayValue.textContent = String(state.day);
  ui.levelValue.textContent = `Уровень ${level}`;
  ui.serveIncomeText.textContent = `+${formatMoney(getIncomePerOrder())}`;
  ui.stockText.textContent = `Осталось: ${state.stock}/${getMaxStock()}`;
  ui.ordersProgressText.textContent = `${state.ordersToday}/${goal}`;
  ui.ordersProgressBar.style.width = `${progress}%`;

  ui.shelfTwo.classList.toggle("locked", state.upgradeLevels.shelf2 === 0);
  ui.shelfThree.classList.toggle("locked", state.upgradeLevels.shelf3 === 0);

  if (level >= 6 && state.upgradeLevels.shelf2 > 0 && state.upgradeLevels.shelf3 > 0) {
    ui.missionText.textContent = "Первая цель выполнена: магазин развит до 6 уровня. Дальше можно добавлять новые отделы, рекламу и задания.";
  }

  renderUpgrades();
}

function renderUpgrades() {
  ui.upgradeList.innerHTML = "";

  for (const upgrade of upgrades) {
    const level = state.upgradeLevels[upgrade.id] ?? 0;
    const isMaxed = level >= upgrade.maxLevel;
    const cost = getUpgradeCost(upgrade, level);
    const button = document.createElement("button");
    button.className = "upgrade-button";
    button.type = "button";
    button.disabled = isMaxed || state.money < cost;
    button.innerHTML = `
      <strong>${upgrade.title}</strong>
      <span class="upgrade-meta">${upgrade.description}</span>
      <span class="upgrade-meta">Уровень: ${level}/${upgrade.maxLevel}</span>
      <span class="upgrade-cost">${isMaxed ? "Готово" : formatMoney(cost)}</span>
    `;
    button.addEventListener("click", () => buyUpgrade(upgrade.id));
    ui.upgradeList.append(button);
  }
}

function setStatus(text) {
  ui.statusText.textContent = text;
}

function animateCustomer() {
  const positions = [
    [50, 50],
    [42, 56],
    [58, 54],
    [50, 62],
  ];
  const [left, top] = positions[Math.floor(Math.random() * positions.length)];
  ui.customer.style.left = `${left}%`;
  ui.customer.style.top = `${top}%`;
  ui.customer.classList.add("happy");
  window.setTimeout(() => ui.customer.classList.remove("happy"), 220);
}

function pulse(element) {
  element.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.03)" },
      { transform: "scale(1)" },
    ],
    { duration: 260, easing: "ease-out" },
  );
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Save failed:", error);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      upgradeLevels: {
        ...structuredClone(defaultState.upgradeLevels),
        ...(parsed.upgradeLevels ?? {}),
      },
    };
  } catch (error) {
    console.warn("Save loading failed:", error);
    return structuredClone(defaultState);
  }
}

function resetGame() {
  const confirmed = window.confirm("Сбросить прогресс MiniMarket 24?");
  if (!confirmed) return;

  state = structuredClone(defaultState);
  saveState();
  setStatus("Прогресс сброшен. Начинаем заново.");
  render();
}

function formatMoney(value) {
  return `${Math.floor(value).toLocaleString("ru-RU")} ₽`;
}
