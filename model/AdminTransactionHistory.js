const mongoose = require("mongoose");

const adminTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  type: {
    type: String,
    enum: ["deposit", "withdraw"],
    required: true,
  },

  amount: {
    type: Number,
    required: true,
  },

  userWalletBefore: Number,
  userWalletAfter: Number,

  adminWalletBefore: Number,
  adminWalletAfter: Number,

  // ✔ Custom formatted timestamp
  formattedTime: String,   // "7:44:11 PM"
  formattedDate: String,   // "27,11,2025"

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "AdminTransactionHistory",
  adminTransactionSchema
);
