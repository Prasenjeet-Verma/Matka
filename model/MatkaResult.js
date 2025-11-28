const mongoose = require("mongoose");

const matkaResultSchema = new mongoose.Schema({
  matkaNo: { type: String, required: true },
  gameName: { type: String, required: true, enum: ["Single", "Patti"] },
  winningNumber: { type: String, required: true },
  declaredAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MatkaResult", matkaResultSchema);
