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
    default: 0, // har new user ka starting wallet 0
  },

  // 💰 BET HISTORY ARRAY
  bets: [
    {
      number: { type: String, required: true }, // selected number
      amount: { type: Number, required: true }, // bet amount
      time: { type: String, required: true }, // Indian time string (like "27/10/2025, 10:22:15 pm")
      createdAt: { type: Date, default: Date.now }, // store as actual Date too
      matkaNo: { type: String, required: true }, // matka game name
      gameName: { type: String, required: true }, // game name based on number
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export model
module.exports = mongoose.model("User", userSchema);
