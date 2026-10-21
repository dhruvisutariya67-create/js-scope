"use strict";

const assert = require("node:assert/strict");
const { createBankAccount } = require("./bank-account");
const { rateLimit } = require("./rate-limiter");

console.log("Running module assertions...");

// 1. Bank Account Privacy & Independent Closures
const a = createBankAccount(100);
const b = createBankAccount(50);

assert.equal(a.deposit(20), 120, "Deposit should correctly increment balance");
assert.equal(a.withdraw(30), 90, "Withdraw should correctly decrement balance");
assert.equal(b.getBalance(), 50, "Separate account closures must not interfere");
assert.equal(a.balance, undefined, "balance property must not be publicly exposed");

assert.throws(() => a.withdraw(91), /Insufficient/, "Overdraft should throw Insufficient balance");
assert.equal(a.getBalance(), 90, "Failed withdrawal must preserve balance");

for (const invalid of [0, -1, NaN, Infinity, 1.5, "10"]) {
  assert.throws(() => a.deposit(invalid), "Invalid deposit amounts must be rejected");
}
assert.throws(() => createBankAccount(-1), "Negative initial balance must be rejected");

// 2. Sliding Window Rate Limiter
let time = 0;
let calls = 0;

const object = {
  value: 7,
  run: rateLimit(function (n) {
    calls++;
    return this.value + n;
  }, 2, 100, () => time)
};

// t = 0: First call
assert.equal(object.run(3), 10, "Should preserve 'this' and return function value");

// t = 50: Second call
time = 50;
assert.equal(object.run(4), 11, "Second call within window should succeed");

// Exceeded limit (2 calls in 100ms)
assert.throws(() => object.run(1), /Rate limit/, "Third call must be rate-limited");
assert.equal(calls, 2, "Blocked calls must not increment inner execution count");

// t = 100: Oldest call (at t=0) expires
time = 100;
assert.equal(object.run(5), 12, "Should allow call when oldest timestamp expires");
assert.throws(() => object.run(1), /Rate limit/, "Limit should be active again");

// t = 150: Call from t=50 expires
time = 150;
assert.equal(object.run(1), 8, "Slot frees up as time advances");

// Invalid limiter arguments
assert.throws(() => rateLimit(() => {}, 0, 100), "Zero maxCalls should throw error");

console.log("✅ All checks passed successfully.");
