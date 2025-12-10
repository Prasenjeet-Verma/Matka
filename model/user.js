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

  creditRef: {
    type: Number,
    default: 0,
  },

    // 🟢 refPl added
  refPl: {
    type: Number,
    default: 0,
  },

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

  userStatus: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
