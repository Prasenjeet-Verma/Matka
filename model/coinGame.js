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
    default: () =>
      new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      ),
  },
});

module.exports = mongoose.model("coinBetHistory", coinBetHistorySchema);
