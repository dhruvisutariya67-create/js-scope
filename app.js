"use strict";

// Initialize demo bank account with ₹1,000.00 (100,000 paise)
const account = createBankAccount(100000);

// Currency formatter for Indian Rupees
const formatCurrency = (paise) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(paise / 100);
};

// UI helper to update status text and error states
function updateStatus(elementId, text, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("error", isError);
}

// Log list helper (keeps max 20 recent items)
function appendLog(listId, messageText) {
  const list = document.getElementById(listId);
  if (!list) return;

  // Clear placeholder text on first real log
  if (list.dataset.hasItems !== "true" && listId === "request-log") {
    list.innerHTML = "";
  }
  list.dataset.hasItems = "true";

  const li = document.createElement("li");
  li.textContent = messageText;
  list.prepend(li);

  while (list.children.length > 20) {
    list.lastElementChild.remove();
  }
}

// -------------------------------------------------------------
// 1. Bank Account Interaction
// -------------------------------------------------------------
const bankForm = document.getElementById("bank-form");
bankForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const action = event.submitter?.value || "deposit";
  const amountInput = document.getElementById("amount");

  try {
    const rupees = Number(amountInput.value);
    const scaled = rupees * 100;
    const paise = Math.round(scaled);

    if (!Number.isFinite(rupees) || rupees <= 0 || !Number.isSafeInteger(paise) || Math.abs(scaled - paise) > 0.0001) {
      throw new Error("Please enter a valid positive amount (max 2 decimal places).");
    }

    const updatedBalance = account[action](paise);

    // Update UI elements
    document.getElementById("balance").textContent = formatCurrency(updatedBalance);
    const logText = `${action === "deposit" ? "Deposited" : "Withdrew"} ${formatCurrency(paise)} · Balance: ${formatCurrency(updatedBalance)}`;
    
    updateStatus("bank-message", logText, false);
    appendLog("history", logText);
    amountInput.value = "";
  } catch (err) {
    updateStatus("bank-message", err.message, true);
  }
});

// Privacy verification inspector
document.getElementById("privacy").addEventListener("click", () => {
  const resultBox = document.getElementById("privacy-result");
  resultBox.textContent = [
    `account.balance          → ${account.balance} (Direct property is hidden)`,
    `account.getBalance()    → ${account.getBalance()} paise (${formatCurrency(account.getBalance())})`
  ].join("\n");
});

// -------------------------------------------------------------
// 2. Rate Limiter Interaction (Max 3 calls per 10s window)
// -------------------------------------------------------------
let acceptedTimestamps = [];
let totalAcceptedRequests = 0;
const monotonicClock = () => performance.now();

// Wrap a simple counter with our sliding-window rate limiter
const limitedApiCall = rateLimit(
  () => ++totalAcceptedRequests,
  3,
  10000,
  monotonicClock
);

function refreshRateLimitSlots() {
  const currentTime = monotonicClock();
  
  // Filter out expired timestamps for visual slots
  acceptedTimestamps = acceptedTimestamps.filter((t) => currentTime - t < 10000);

  const slotElements = document.querySelectorAll(".slots i");
  slotElements.forEach((slot, index) => {
    slot.classList.toggle("used", index < acceptedTimestamps.length);
  });

  const availableSlots = 3 - acceptedTimestamps.length;
  const nextFreeSeconds = acceptedTimestamps.length
    ? Math.max(0, Math.ceil((10000 - (currentTime - acceptedTimestamps[0])) / 1000))
    : 0;

  const statusLabel = `${availableSlots} slot${availableSlots === 1 ? "" : "s"} available${
    nextFreeSeconds ? ` · Next slot in ${nextFreeSeconds}s` : ""
  }`;

  updateStatus("limit-status", statusLabel, false);
}

document.getElementById("api-call").addEventListener("click", () => {
  const timeString = new Date().toLocaleTimeString();

  try {
    const requestNumber = limitedApiCall();
    acceptedTimestamps.push(monotonicClock());

    const successMessage = `Request #${requestNumber} accepted.`;
    updateStatus("api-message", successMessage, false);
    appendLog("request-log", `${timeString} — ${successMessage}`);
  } catch (err) {
    const retrySeconds = Math.ceil(err.retryAfterMs / 1000);
    const blockedMessage = `Blocked by rate limiter. Retry in ${retrySeconds}s.`;
    
    updateStatus("api-message", blockedMessage, true);
    appendLog("request-log", `${timeString} — ⚠️ ${blockedMessage}`);
  }

  refreshRateLimitSlots();
});

// Smoothly refresh remaining countdown every 200ms
setInterval(refreshRateLimitSlots, 200);
refreshRateLimitSlots();

// -------------------------------------------------------------
// 3. Runtime Concepts Runner
// -------------------------------------------------------------
document.getElementById("run-concepts").addEventListener("click", () => {
  const logs = [];

  // 1. Lexical Scope
  const outerScopeValue = "global-lexical-scope";
  function getScopeValue() {
    return outerScopeValue;
  }
  function callFromDifferentScope() {
    const outerScopeValue = "shadowed-local-scope";
    return getScopeValue();
  }
  logs.push(`[Lexical Scope] Read: "${callFromDifferentScope()}" (Resolved from definition site)`);

  // 2. Closure Isolation
  function createCounter() {
    let count = 0;
    return () => ++count;
  }
  const counter1 = createCounter();
  const counter2 = createCounter();
  logs.push(`[Closures] Counter1: ${counter1()}, ${counter1()} | Counter2: ${counter2()} (Separate lexical environments)`);

  // 3. Hoisting & TDZ
  function testHoisting() {
    logs.push(`[Hoisting] var before declaration: ${hoistedVar}`);
    var hoistedVar = "Initialized now";

    try {
      logs.push(tdzLet);
    } catch (e) {
      logs.push(`[Hoisting] let in TDZ: ${e.name} (Cannot access before initialization)`);
    }
    let tdzLet = "Block initialized";

    try {
      logs.push(tdzConst);
    } catch (e) {
      logs.push(`[Hoisting] const in TDZ: ${e.name} (Cannot access before initialization)`);
    }
    const tdzConst = "Const initialized";
  }
  testHoisting();

  logs.push("[Execution Context] Each call pushed a new frame onto Call Stack and popped cleanly.");

  document.getElementById("concept-output").textContent = logs.join("\n");
});
