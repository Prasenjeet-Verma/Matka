const mongoose = require("mongoose");

const matkaBetHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  number: { type: String, required: true },
  amount: { type: Number, required: true },

  time: { type: String, required: true },
  date: { type: String, required: true },

  matkaNo: { type: String, required: true },
  gameName: { type: String, default: "Matka" },

  status: {
    type: String,
    enum: ["unsettled", "settled"],
    default: "unsettled"
  },

  result: { type: String, default: null },   // WIN / LOSS
  profit: { type: Number, default: 0 },

  createdAt: {
    type: Date,
    default: () =>
      new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      )
  },
});

module.exports = mongoose.model("MatkaBetHistory", matkaBetHistorySchema);

