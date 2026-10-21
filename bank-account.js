"use strict";

/**
 * Creates an encapsulated bank account using closures for private state.
 * All financial amounts are stored as integer paise to prevent floating-point inaccuracies.
 */
function createBankAccount(initialBalance = 0) {
  if (!Number.isSafeInteger(initialBalance) || initialBalance < 0) {
    throw new Error("Initial balance must be a non-negative integer (paise).");
  }

  // Private balance variable kept in the closure of the returned methods
  let balance = initialBalance;

  function validateAmount(amount) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error("Amount must be a positive integer (paise).");
    }
  }

  return Object.freeze({
    deposit(amount) {
      validateAmount(amount);
      if (!Number.isSafeInteger(balance + amount)) {
        throw new Error("Balance too large");
      }
      balance += amount;
      return balance;
    },

    withdraw(amount) {
      validateAmount(amount);
      if (amount > balance) {
        throw new Error("Insufficient balance");
      }
      balance -= amount;
      return balance;
    },

    getBalance() {
      return balance;
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createBankAccount };
}
