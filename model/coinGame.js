const mongoose = require("mongoose");

const coinBetHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gameName: String,
  userPick: String,
  amount: Number,
  result: String,
  profit: Number,
  coinGame: { type: String, default: "Heads & Tails" },
  createdAt: {
    type: Date,
    default: () => new Date(Date.now() + 5.5 * 60 * 60 * 1000), // IST
  },
});

module.exports = mongoose.model("CoinBetHistory", coinBetHistorySchema);
