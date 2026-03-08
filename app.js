const STORE_KEY = "budget-calendar-v1";

const state = {
  monthlyBudget: 3000,
  dailyBudget: 100,
  budgetInputMode: "daily",
  entries: {},
  selectedDate: formatDate(new Date()),
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
  viewMode: "year",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthlyBudgetInput = document.getElementById("monthlyBudget");
const dailyBudgetInput = document.getElementById("dailyBudget");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const yearViewBtn = document.getElementById("yearViewBtn");
const monthViewBtn = document.getElementById("monthViewBtn");
const prevPeriodBtn = document.getElementById("prevPeriodBtn");
const nextPeriodBtn = document.getElementById("nextPeriodBtn");
const periodLabel = document.getElementById("periodLabel");

const yearCalendar = document.getElementById("yearCalendar");
const monthCalendar = document.getElementById("monthCalendar");
const calendarWrap = document.querySelector(".calendar-wrap");
const monthAxis = document.getElementById("monthAxis");
const calendarGrid = document.getElementById("calendarGrid");
const monthGrid = document.getElementById("monthGrid");

const selectedDateLabel = document.getElementById("selectedDateLabel");
const spendInput = document.getElementById("spendInput");
const entryForm = document.getElementById("entryForm");
const spendTitle = document.getElementById("spendTitle");
const remainTitle = document.getElementById("remainTitle");
const todaySpend = document.getElementById("todaySpend");
const todayRemain = document.getElementById("todayRemain");
const reserveFund = document.getElementById("reserveFund");

boot();

function boot() {
  load();
  resetSelectionToToday();
  bindEvents();
  renderAll();
}

function resetSelectionToToday() {
  const today = new Date();
  state.selectedDate = formatDate(today);
  state.viewYear = today.getFullYear();
  state.viewMonth = today.getMonth();
}
function bindEvents() {
  saveBudgetBtn.addEventListener("click", () => {
    const monthly = Number(monthlyBudgetInput.value);
    const daily = Number(dailyBudgetInput.value);

    if (!Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(daily) || daily < 0) {
      alert("请输入有效预算金额");
      return;
    }

    state.monthlyBudget = Number(monthly.toFixed(2));
    state.dailyBudget = Number(daily.toFixed(2));
    persist();
    renderAll();
  });

  dailyBudgetInput.addEventListener("input", () => {
    const daily = Number(dailyBudgetInput.value);
    if (!Number.isFinite(daily) || daily < 0) return;
    state.dailyBudget = Number(daily.toFixed(2));
    state.budgetInputMode = "daily";
    syncMonthlyFromDaily();
  });

  monthlyBudgetInput.addEventListener("input", () => {
    const monthly = Number(monthlyBudgetInput.value);
    if (!Number.isFinite(monthly) || monthly < 0) return;
    state.monthlyBudget = Number(monthly.toFixed(2));
    state.budgetInputMode = "monthly";
    syncDailyFromMonthly();
  });

  yearViewBtn.addEventListener("click", () => {
    state.viewMode = "year";
    renderCalendar();
  });

  monthViewBtn.addEventListener("click", () => {
    state.viewMode = "month";
    const selected = toDate(state.selectedDate);
    state.viewYear = selected.getFullYear();
    state.viewMonth = selected.getMonth();
    renderCalendar();
  });

  prevPeriodBtn.addEventListener("click", () => {
    if (state.viewMode === "year") {
      state.viewYear -= 1;
    } else {
      moveMonth(-1);
    }
    renderCalendar();
  });

  nextPeriodBtn.addEventListener("click", () => {
    if (state.viewMode === "year") {
      state.viewYear += 1;
    } else {
      moveMonth(1);
    }
    renderCalendar();
  });

  entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const spend = Number(spendInput.value);
    if (!Number.isFinite(spend) || spend < 0) {
      alert("请输入有效支出金额");
      return;
    }
    state.entries[state.selectedDate] = Number(spend.toFixed(2));
    persist();
    renderAll();
  });

  window.addEventListener("resize", () => {
    if (state.viewMode === "year") {
      fitYearCalendar();
    }
  });
}

function renderAll() {
  syncBudgetByMode();
  monthlyBudgetInput.value = state.monthlyBudget;
  dailyBudgetInput.value = state.dailyBudget;
  renderCalendar();
  renderEntryForm();
  renderStats();
}

function renderCalendar() {
  yearViewBtn.classList.toggle("active", state.viewMode === "year");
  monthViewBtn.classList.toggle("active", state.viewMode === "month");

  if (state.viewMode === "year") {
    calendarWrap.classList.add("year-fit");
    yearCalendar.classList.remove("hidden");
    monthCalendar.classList.add("hidden");
    periodLabel.textContent = `${state.viewYear}`;
    renderYearCalendar();
    return;
  }

  calendarWrap.classList.remove("year-fit");
  yearCalendar.classList.add("hidden");
  yearCalendar.style.transform = "";
  yearCalendar.style.height = "";
  monthCalendar.classList.remove("hidden");
  periodLabel.textContent = `${MONTH_NAMES[state.viewMonth]} ${state.viewYear}`;
  renderMonthCalendar();
}

function renderYearCalendar() {
  calendarGrid.innerHTML = "";
  monthAxis.innerHTML = "";

  const start = new Date(state.viewYear, 0, 1);
  const end = new Date(state.viewYear, 11, 31);

  const startOffset = (start.getDay() + 6) % 7;
  const firstMonday = addDays(start, -startOffset);
  const endOffset = (end.getDay() + 6) % 7;
  const lastSunday = addDays(end, 6 - endOffset);

  const totalDays = daysBetween(firstMonday, lastSunday) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  calendarGrid.style.setProperty("--weeks", String(totalWeeks));
  monthAxis.style.setProperty("--weeks", String(totalWeeks));

  for (let i = 0; i < totalDays; i += 1) {
    const date = addDays(firstMonday, i);
    const dateStr = formatDate(date);
    const inYear = date.getFullYear() === state.viewYear;

    const weekIndex = Math.floor(i / 7);
    const weekday = ((date.getDay() + 6) % 7) + 1;

    const dayEl = createDayCell({
      date,
      dateStr,
      inRange: inYear,
      gridColumn: weekIndex + 1,
      gridRow: weekday,
      monthMode: false,
    });

    calendarGrid.appendChild(dayEl);
  }

  for (let month = 0; month < 12; month += 1) {
    const firstDay = new Date(state.viewYear, month, 1);
    const weekIndex = Math.floor(daysBetween(firstMonday, firstDay) / 7);

    const label = document.createElement("span");
    label.className = "month-label";
    label.textContent = MONTH_NAMES[month];
    label.style.gridColumn = String(weekIndex + 1);

    monthAxis.appendChild(label);
  }

  fitYearCalendar();
}

function fitYearCalendar() {
  yearCalendar.style.transform = "";
  yearCalendar.style.height = "";
  yearCalendar.style.transformOrigin = "top left";

  const contentWidth = yearCalendar.scrollWidth;
  const availableWidth = calendarWrap.clientWidth;
  if (!contentWidth || !availableWidth) return;

  const scale = Math.min(1, availableWidth / contentWidth);
  if (scale < 1) {
    yearCalendar.style.transform = `scale(${scale})`;
    yearCalendar.style.height = `${Math.ceil(yearCalendar.scrollHeight * scale)}px`;
  }
}

function renderMonthCalendar() {
  monthGrid.innerHTML = "";

  const firstDay = new Date(state.viewYear, state.viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < 42; i += 1) {
    const date = addDays(firstDay, i - startOffset);
    const dateStr = formatDate(date);
    const inMonth = date.getFullYear() === state.viewYear && date.getMonth() === state.viewMonth;

    const dayEl = createDayCell({
      date,
      dateStr,
      inRange: inMonth,
      monthMode: true,
    });

    const num = document.createElement("span");
    num.className = "day-num";
    num.textContent = String(date.getDate());
    dayEl.appendChild(num);

    if (inMonth) {
      const spend = state.entries[dateStr];
      if (typeof spend === "number") {
        const remain = Number((state.dailyBudget - spend).toFixed(2));
        const remainEl = document.createElement("span");
        remainEl.className = "day-remain";

        if (remain > 0) {
          remainEl.classList.add("positive");
        } else if (remain < 0) {
          remainEl.classList.add("negative");
        } else {
          remainEl.classList.add("zero");
        }

        remainEl.textContent = formatSignedAmount(remain);
        dayEl.appendChild(remainEl);
      }
    }

    monthGrid.appendChild(dayEl);
  }
}

function createDayCell({ dateStr, inRange, gridColumn, gridRow, monthMode }) {
  const dayEl = document.createElement("button");
  dayEl.type = "button";
  dayEl.className = monthMode ? "day month-day" : "day";

  if (!monthMode) {
    dayEl.style.gridColumn = String(gridColumn);
    dayEl.style.gridRow = String(gridRow);
  }

  if (!inRange) {
    dayEl.classList.add("inactive");
    dayEl.disabled = true;
    return dayEl;
  }

  const spend = state.entries[dateStr] ?? null;
  const level = getHeatLevel(spend, state.dailyBudget);
  if (level === null) {
    dayEl.classList.add("lv-empty");
  } else {
    dayEl.classList.add(`lv${level}`);
  }

  dayEl.title = `${dateStr} | 支出: ${spend === null ? "未登记" : `¥${spend}`} | 预算: ¥${state.dailyBudget}`;
  dayEl.dataset.date = dateStr;

  if (dateStr === state.selectedDate) {
    dayEl.classList.add("active");
  }

  dayEl.addEventListener("click", () => {
    state.selectedDate = dateStr;
    renderAll();
  });

  return dayEl;
}

function renderEntryForm() {
  selectedDateLabel.textContent = `当前选择：${state.selectedDate}`;
  const current = state.entries[state.selectedDate];
  spendInput.value = current ?? "";
}

function renderStats() {
  const selectedDate = state.selectedDate;
  const selectedValue = state.entries[selectedDate] ?? 0;
  const remain = state.dailyBudget - selectedValue;

  const today = formatDate(new Date());
  const reserve = calculateReserveToDate(today);

  spendTitle.textContent = `支出（${selectedDate}）`;
  remainTitle.textContent = `结余（${selectedDate}）`;

  todaySpend.textContent = money(selectedValue);
  todayRemain.textContent = money(remain);
  reserveFund.textContent = money(reserve);

  applySignedAmountClass(todayRemain, remain, true);
  applySignedAmountClass(reserveFund, reserve, true);
}

function applySignedAmountClass(element, value, greenWhenPositive) {
  element.classList.remove("amount-positive", "amount-negative");
  if (value < 0) {
    element.classList.add("amount-negative");
    return;
  }
  if (greenWhenPositive && value > 0) {
    element.classList.add("amount-positive");
  }
}

function calculateReserveToDate(targetDateStr) {
  const target = toDate(targetDateStr);
  let reserve = 0;

  for (let date = new Date(target.getFullYear(), 0, 1); date <= target; date = addDays(date, 1)) {
    const key = formatDate(date);
    const spend = state.entries[key];
    if (typeof spend === "number") {
      reserve += state.dailyBudget - spend;
    }
  }
  return Number(reserve.toFixed(2));
}

function getHeatLevel(spend, budget) {
  if (spend === null || spend === undefined) return null;
  const remain = budget - spend;
  if (remain <= -50) return 0;
  if (remain < 0) return 1;
  if (remain === 0) return 2;
  if (remain < 50) return 3;
  return 4;
}

function moveMonth(step) {
  let month = state.viewMonth + step;
  let year = state.viewYear;

  if (month < 0) {
    month = 11;
    year -= 1;
  } else if (month > 11) {
    month = 0;
    year += 1;
  }

  state.viewMonth = month;
  state.viewYear = year;
}


function getBudgetDaysInMonth() {
  const baseDate = state.selectedDate ? toDate(state.selectedDate) : new Date();
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
}

function formatBudgetValue(value) {
  return Number(value.toFixed(2)).toString();
}

function syncBudgetByMode() {
  const days = getBudgetDaysInMonth();
  if (days <= 0) return;

  if (state.budgetInputMode === "monthly") {
    state.dailyBudget = Number((state.monthlyBudget / days).toFixed(2));
    return;
  }

  state.monthlyBudget = Number((state.dailyBudget * days).toFixed(2));
}

function syncMonthlyFromDaily() {
  const days = getBudgetDaysInMonth();
  if (days <= 0) return;
  const monthly = state.dailyBudget * days;
  state.monthlyBudget = Number(monthly.toFixed(2));
  monthlyBudgetInput.value = formatBudgetValue(monthly);
}

function syncDailyFromMonthly() {
  const days = getBudgetDaysInMonth();
  const daily = days > 0 ? state.monthlyBudget / days : 0;
  state.dailyBudget = Number(daily.toFixed(2));
  dailyBudgetInput.value = formatBudgetValue(daily);
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.monthlyBudget === "number") {
      state.monthlyBudget = parsed.monthlyBudget;
    }
    if (typeof parsed.dailyBudget === "number") {
      state.dailyBudget = parsed.dailyBudget;
    }
    if (parsed.budgetInputMode === "monthly" || parsed.budgetInputMode === "daily") {
      state.budgetInputMode = parsed.budgetInputMode;
    }
    if (parsed.entries && typeof parsed.entries === "object") {
      state.entries = parsed.entries;
    }
  } catch (error) {
    console.error("加载本地数据失败", error);
  }
}

function persist() {
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      monthlyBudget: state.monthlyBudget,
      dailyBudget: state.dailyBudget,
      budgetInputMode: state.budgetInputMode,
      entries: state.entries,
    }),
  );
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.round((to - from) / msPerDay);
}
function formatSignedAmount(value) {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(abs);

  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return "0";
}

function money(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

























