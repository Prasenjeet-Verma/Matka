const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },

  referCode: {
    type: String,
    required: true,
  },

  wallet: {
    type: Number,
    default: 0,
  },

  // 💰 BET HISTORY ARRAY
  bets: [
    {
      number: { type: String, required: true },
      amount: { type: Number, required: true },

      // DATE & TIME FIXED
      time: { type: String, required: true }, // Example: "15:27:32"
      date: { type: String, required: true }, // Example: "18,11,2025"

      createdAt: { type: Date, default: Date.now },
      matkaNo: { type: String, required: true },
      gameName: { type: String, required: true },
    },
  ],

  playCount: {
    type: Number,
    default: 0,
  },

  currentUserChoiceBandS: {
    type: Number,
    default: null,
  },

role: {
  type: String,
  enum: ["admin", "master", "agent", "user"],
  default: "user",
},

referredBy: {
  type: String,
  default: null,
},



  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);

