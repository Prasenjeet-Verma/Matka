const mongoose = require("mongoose");

const coinBetHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gameName: String,
  matkaNo: String,
  coinGame: { type: String, default: "Heads & Tails" },
  userPick: String,
  number: String,
  amount: Number,
  result: String,
  profit: Number,
  createdAt: {
    type: Date,
    default: () => new Date(), // UTC date store
  },
});

module.exports = mongoose.model("CoinBetHistory", coinBetHistorySchema);
