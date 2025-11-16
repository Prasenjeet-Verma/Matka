const mongoose = require("mongoose");

const coinBetHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gameName: String,
  userPick: String,
  amount: Number,
  result: String,
  profit: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("coinBetHistory", coinBetHistorySchema);
