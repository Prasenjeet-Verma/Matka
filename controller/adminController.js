const User = require("../model/user");
const MatkaHistory = require("../model/matkaBetHistory");
const CoinBetHistory = require("../model/coinGame");
const MatkaResult = require("../model/MatkaResult"); // import at top
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt"); // to verify admin password

exports.getAdminPanelDashboard = async (req, res, next) => {
  try {
    // 1️⃣ Check admin login session
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }
    const user = await User.findById(req.session.user._id);

    if (!user || user.role !== "admin") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    const visibleUsers = await User.find({
      role: { $in: ["admin", "master", "agent", "user"] },
    });

    if (user.role === "admin") {
      // 2️⃣ Render admin dashboard EJS with user data
      res.render("adminpaneldashboard", {
        username: user.username,
        wallet: user.wallet, // ⭐ FIX
        referCode: user.referCode,
        user: user,
        isLoggedIn: req.session.isLoggedIn,
        visibleUsers,
      });
    } else {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
  } catch (err) {
    console.error("❌ Admin Dashboard Error:", err);
    res.status(500).send("Server Error");
  }
};


async function getBetDownlineUserIds(loginUser) {
  let ids = [];

  if (loginUser.role === "admin") {
    const masters = await User.find({ role: "master" });
    const agents  = await User.find({ role: "agent" });
    const users   = await User.find({ role: "user" });

    ids = [
      ...masters.map(m => m._id),
      ...agents.map(a => a._id),
      ...users.map(u => u._id),
    ];

  } else if (loginUser.role === "master") {
    // Agents referred by master
    const agents = await User.find({ role: "agent", referredBy: loginUser.referCode });
    // Users directly referred by master
    const directUsers = await User.find({ role: "user", referredBy: loginUser.referCode });
    // Users referred by master's agents
    const agentUsers = await User.find({ role: "user", referredBy: { $in: agents.map(a => a.referCode) } });

    ids = [
      ...directUsers.map(u => u._id),
      ...agentUsers.map(u => u._id),
    ];

  } else if (loginUser.role === "agent") {
    // Only users directly referred by agent
    const users = await User.find({ role: "user", referredBy: loginUser.referCode });
    ids = users.map(u => u._id);
  }

  return ids;
}

exports.getAllOpretorsbetHistory = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

const loginUser = await User.findById(req.session.user._id);
if (!loginUser || !["admin", "master", "agent"].includes(loginUser.role)) {
  req.session.destroy(() => res.redirect("/login"));
  return;
}


    // -----------------------------
    // FILTER HANDLING
    // -----------------------------
    let { source, start, end } = req.query;

    let startDate, endDate;

    if (source === "live") {
      // LIVE → last 24 hours (IST)
      endDate = new Date(Date.now());
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (source === "backup") {
      // last 7 days
      endDate = new Date(Date.now());
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (source === "old") {
      // last 30 days
      endDate = new Date(Date.now());
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (start && end) {
      // -----------------------------
      // MANUAL DATE (IST START & END)
      // -----------------------------

      // Start → 00:00:00 IST
      startDate = new Date(`${start}T00:00:00.000+05:30`);

      // End → 23:59:59 IST
      endDate = new Date(`${end}T23:59:59.999+05:30`);
    } else {
      // default: show all
      startDate = new Date("2000-01-01");
      endDate = new Date();
    }

    // ---------------------------------------------
    // APPLY FILTERS
    // ---------------------------------------------
const allowedUserIds = await getBetDownlineUserIds(loginUser);

const matkaUnsettled = await MatkaHistory.find({
  status: "unsettled",
  userId: { $in: allowedUserIds },
  createdAt: { $gte: startDate, $lte: endDate },
}).populate("userId");

const matkaSettled = await MatkaHistory.find({
  status: "settled",
  userId: { $in: allowedUserIds },
  createdAt: { $gte: startDate, $lte: endDate },
}).populate("userId");

const coinBets = await CoinBetHistory.find({
  userId: { $in: allowedUserIds },
  createdAt: { $gte: startDate, $lte: endDate },
}).populate("userId");

    
    const allSettledBets = [...matkaSettled, ...coinBets].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

res.render("alloperatorsbethtry", {
  username: loginUser.username,
  wallet: loginUser.wallet,
  referCode: loginUser.referCode,
  user: loginUser,
  role: loginUser.role,
  isLoggedIn: req.session.isLoggedIn,
  matkaUnsettled,
  matkaSettled,
  coinBets,
  allSettledBets,
  source: source || "",
  start: start || "",
  end: end || "",
});
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.getDeclareData = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    if (!user || user.role !== "admin") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    const bets = await MatkaHistory.find({ status: "unsettled" });

    let single = {};
    let patti = {};

    bets.forEach((bet) => {
      if (bet.gameName === "Single") {
        const matka = bet.matkaNo;
        const num = bet.number;

        if (!single[matka]) {
          single[matka] = {};
        }

        if (!single[matka][num]) {
          single[matka][num] = { totalAmount: 0, usersCount: 0 };
        }

        single[matka][num].totalAmount += bet.amount;
        single[matka][num].usersCount += 1;
      }
    });

    bets.forEach((bet) => {
      if (bet.gameName === "Patti") {
        const matka = bet.matkaNo; // group by matka
        const under = bet.underNo;
        const num = bet.number;

        // Create group for matkaNo
        if (!patti[matka]) {
          patti[matka] = {
            underNumbers: {},
          };
        }

        // Create under group inside matka
        if (!patti[matka].underNumbers[under]) {
          patti[matka].underNumbers[under] = {};
        }

        // Create number group inside under
        if (!patti[matka].underNumbers[under][num]) {
          patti[matka].underNumbers[under][num] = {
            totalAmount: 0,
            usersCount: 0,
          };
        }

        // Add amount & count
        patti[matka].underNumbers[under][num].totalAmount += bet.amount;
        patti[matka].underNumbers[under][num].usersCount += 1;
      }
    });

    res.render("declareMatka", {
      username: user.username,
      wallet: user.wallet,
      referCode: user.referCode,
      user,
      isLoggedIn: req.session.isLoggedIn,
      single,
      patti,
    });
  } catch (err) {
    console.log("Declare Data Error:", err);
    res.json({ success: false, message: "Server Error" });
  }
};

// ---------------- Single Result ----------------

exports.postDeclareSingleResult = async (req, res) => {
  try {
    // ... your existing checks
    if (!req.session.isLoggedIn || !req.session.user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    if (!user || user.role !== "admin") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    const { matkaNo, singleResult } = req.body;

    if (!matkaNo || !singleResult) {
      return res.status(400).send("MatkaNo or result missing");
    }

    // Save the declared result to MatkaResult
    await MatkaResult.create({
      matkaNo,
      gameName: "Single",
      winningNumber: singleResult.toString(),
    });

    // Process unsettled bets
    const bets = await MatkaHistory.find({
      matkaNo,
      gameName: "Single",
      status: "unsettled",
    });

    for (let bet of bets) {
      if (bet.number.toString() === singleResult.toString()) {
        bet.result = "WIN";
        bet.profit = bet.amount * 9;
        await User.findByIdAndUpdate(bet.userId, {
          $inc: { wallet: bet.profit },
        });
      } else {
        bet.result = "LOSS";
        bet.profit = -bet.amount;
      }

      bet.status = "settled";
      await bet.save();
    }

    res.redirect("/declareMatka");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

// ---------------- Patti Result ----------------
exports.postDeclarePattiResult = async (req, res) => {
  try {
    // ... your existing checks
    if (!req.session.isLoggedIn || !req.session.user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    if (!user || user.role !== "admin") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    const { matkaNo, pattiResult } = req.body;

    if (!matkaNo || !pattiResult) {
      return res.status(400).send("MatkaNo or result missing");
    }

    // Save the declared result to MatkaResult
    await MatkaResult.create({
      matkaNo,
      gameName: "Patti",
      winningNumber: pattiResult.toString(),
    });

    // Process unsettled bets
    const bets = await MatkaHistory.find({
      matkaNo,
      gameName: "Patti",
      status: "unsettled",
    });

    for (let bet of bets) {
      if (bet.number.toString() === pattiResult.toString()) {
        bet.result = "WIN";
        bet.profit = bet.amount * 12;
        await User.findByIdAndUpdate(bet.userId, {
          $inc: { wallet: bet.profit },
        });
      } else {
        bet.result = "LOSS";
        bet.profit = -bet.amount;
      }

      bet.status = "settled";
      await bet.save();
    }

    res.redirect("/declareMatka");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};






exports.getUserDownLine = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    const loggedUser = await User.findById(req.session.user._id);
    if (!loggedUser || !["admin", "master", "agent"].includes(loggedUser.role)) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    // 🟢 Status filter
    const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
    const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
    const statusValue = statusMap[statusFilter] || "active";

    // 🟢 Base query
    let query = {
      role: "user",
      userStatus: statusValue,
      referredBy: loggedUser.referCode, // 🔥 restrict all roles to own referrals
    };

    const users = await User.find(query).sort({ createdAt: -1 });

    res.render("userdownline", {
      username: loggedUser.username,
      wallet: loggedUser.wallet,
      referCode: loggedUser.referCode,
      user: loggedUser,
      users,
      errors: [],
      isLoggedIn: true,
      oldInput: {},
      selectedStatus: statusFilter,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


exports.postCreateuser = [
  // ================= VALIDATION =================
  check("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .custom(async (value) => {
      const exist = await User.findOne({ username: value });
      if (exist) throw new Error("Username already exists");
      return true;
    }),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  check("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("referCode")
    .trim()
    .notEmpty()
    .withMessage("Referral code is required"),

  // ================= CONTROLLER =================
  async (req, res) => {
    try {
      /* 🔐 SESSION CHECK */
      if (!req.session.isLoggedIn || !req.session.user) {
        return req.session.destroy(() => res.redirect("/login"));
      }

      const loggedUser = await User.findById(req.session.user._id);
      if (
        !loggedUser ||
        !["admin", "master", "agent"].includes(loggedUser.role)
      ) {
        return req.session.destroy(() => res.redirect("/login"));
      }

      // 🟢 Status Filter (for reload)
      const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
      const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
      const statusValue = statusMap[statusFilter] || "active";

      const errors = validationResult(req);
      const { username, password, referCode } = req.body;

      /* ================= ERROR RENDER ================= */
      const renderError = async (msgs) => {
        let query = {
          role: "user",
          userStatus: statusValue,
        };

        // 🔐 admin vs master/agent visibility
        if (loggedUser.role !== "admin") {
          query.referredBy = loggedUser.referCode;
        }

        const users = await User.find(query).sort({ createdAt: -1 });

        return res.status(400).render("userdownline", {
          username: loggedUser.username,
          wallet: loggedUser.wallet,
          referCode: loggedUser.referCode,
          user: loggedUser,
          users,
          isLoggedIn: true,
          errors: msgs,
          oldInput: { username },
          openModal: true,
          selectedStatus: statusFilter,
        });
      };

      if (!errors.isEmpty()) {
        return renderError(errors.array().map((e) => e.msg));
      }

      /* ================= REFER CODE CHECK ================= */
      const referrer = await User.findOne({
        referCode,
        role: { $in: ["admin", "master", "agent"] },
      });

      if (!referrer) {
        return renderError(["Invalid referral code"]);
      }

      // 🚫 master / agent cannot use other's referCode
      if (
        loggedUser.role !== "admin" &&
        referrer._id.toString() !== loggedUser._id.toString()
      ) {
        return renderError(["You can only use your own referral code"]);
      }

      /* ================= PASSWORD HASH ================= */
      const hashedPassword = await bcrypt.hash(password, 10);

      /* ================= UNIQUE REFER CODE ================= */
      let newReferCode;
      do {
        newReferCode = Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase();
      } while (await User.findOne({ referCode: newReferCode }));

      /* ================= CREATE USER ================= */
      const newUser = new User({
        username,
        password: hashedPassword,
        role: "user",
        referCode: newReferCode,
        referredBy: referCode,
      });

      await newUser.save();

      return res.redirect("/userDownLine");
    } catch (err) {
      console.error("postCreateuser error:", err);
      return res.status(500).send("Server Error");
    }
  },
];





const AdminTransactionHistory = require("../model/AdminTransactionHistory");
const mongoose = require("mongoose");

exports.getUserProfileByAdmin = async (req, res) => {
  try {
    /* ================= SESSION CHECK ================= */
    if (!req.session?.isLoggedIn || !req.session.user) {
      return req.session
        ? req.session.destroy(() => res.redirect("/login"))
        : res.redirect("/login");
    }

    /* ================= OPERATOR ================= */
    const operator = await User.findById(req.session.user._id);
    if (!operator || !["admin", "master", "agent"].includes(operator.role)) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    /* ================= PARAM CHECK ================= */
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid User ID");
    }

    /* ================= TARGET USER ================= */
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).send("User not found");
    }

    /* =================================================
       🔐 ROLE BASED ACCESS CONTROL (CORE LOGIC)
    ================================================= */

    // ❌ same role access block (except admin)
    if (
      operator.role !== "admin" &&
      operator.role === targetUser.role
    ) {
      return res.status(403).send("Access denied");
    }

    // ❌ agent restrictions
    if (
      operator.role === "agent" &&
      targetUser.role !== "user"
    ) {
      return res.status(403).send("Access denied");
    }

    // ❌ master cannot access master
    if (
      operator.role === "master" &&
      targetUser.role === "master"
    ) {
      return res.status(403).send("Access denied");
    }

    // ❌ downline restriction (except admin)
    if (
      operator.role !== "admin" &&
      targetUser.referredBy !== operator.referCode
    ) {
      return res.status(403).send("Access denied");
    }

    /* ================= RENDER ================= */
    return res.render("adminSeeUserProfile", {
      user: targetUser,
      username: operator.username,
      wallet: operator.wallet,
      referCode: operator.referCode,
      role: operator.role,
      isLoggedIn: true,
    });

  } catch (err) {
    console.error("getUserProfileByAdmin error:", err);
    return res.status(500).send("Server Error");
  }
};

const SALT_ROUNDS = 10;

exports.changeUserPasswordByOperator = async (req, res) => {
  try {
    // 1️⃣ SESSION + ROLE CHECK
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const operator = await User.findById(req.session.user._id);
    if (!operator || !["admin", "master", "agent"].includes(operator.role)) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    // 2️⃣ INPUT VALIDATION
    const { userId, newPassword, confirmNewPassword } = req.body;
    if (!userId || !newPassword || !confirmNewPassword)
      return res.json({ success: false, message: "All fields are required" });
    if (newPassword !== confirmNewPassword)
      return res.json({ success: false, message: "Passwords do not match" });
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // 3️⃣ VALIDATE USER ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.json({ success: false, message: "Invalid user ID" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser || targetUser.role !== "user") {
      return res.json({ success: false, message: "User not found" });
    }

    // 4️⃣ ROLE-BASED ACCESS
    if (
      operator.role !== "admin" &&
      targetUser.referredBy !== operator.referCode
    ) {
      return res.json({
        success: false,
        message: "Access denied: You can only change your own downline users",
      });
    }

    // 5️⃣ HASH NEW PASSWORD
    const hashed = await bcrypt.hash(newPassword, 10); // SALT_ROUNDS = 10

    // 6️⃣ UPDATE PASSWORD
    await User.findByIdAndUpdate(userId, { password: hashed });

    // 7️⃣ AUDIT LOG
    console.log(
      `${operator.role.toUpperCase()} ${operator.username} (${operator._id}) changed password for user ${targetUser.username} (${userId}) at ${new Date().toISOString()}`
    );

    return res.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (err) {
    console.error("changeUserPasswordByOperator error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};


exports.seeUserPersonallyBetHistory = async (req, res) => {
  try {
    // 🔐 SESSION CHECK
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const loggedUser = await User.findById(req.session.user._id);
    if (!loggedUser || !["admin", "master", "agent"].includes(loggedUser.role)) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    // 🔍 USER ID VALIDATION
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid user ID");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    // 🚫 PERMISSION CHECK
    // Admin → can see anyone
    // Master / Agent → only their referred users
    if (
      loggedUser.role !== "admin" &&
      user.referredBy !== loggedUser.referCode
    ) {
      return res.status(403).send("Access denied");
    }

    // -------------------------------------
    // 📅 DATE FILTER (IST)
    // -------------------------------------
    let { source, start, end } = req.query;

    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    let startDate, endDate;

    if (source === "live") {
      endDate = new Date(Date.now() + IST_OFFSET);
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (source === "backup") {
      endDate = new Date(Date.now() + IST_OFFSET);
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (source === "old") {
      endDate = new Date(Date.now() + IST_OFFSET);
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (start && end) {
      startDate = new Date(`${start}T00:00:00.000+05:30`);
      endDate = new Date(`${end}T23:59:59.999+05:30`);
    } else {
      startDate = new Date("2000-01-01");
      endDate = new Date(Date.now() + IST_OFFSET);
    }

    // -------------------------------------
    // 📦 DB QUERIES
    // -------------------------------------
    const matkaUnsettled = await MatkaHistory.find({
      userId,
      status: "unsettled",
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("userId", "username");

    const matkaSettled = await MatkaHistory.find({
      userId,
      status: "settled",
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("userId", "username");

    const coinBets = await CoinBetHistory.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("userId", "username");

    const allSettledBets = [...matkaSettled, ...coinBets].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // -------------------------------------
    // 🎯 RENDER (SAME PAGE FOR ALL ROLES)
    // -------------------------------------
    return res.render("adminOneUserBet", {
      username: loggedUser.username,
      wallet: loggedUser.wallet,
      referCode: loggedUser.referCode,
      isLoggedIn: req.session.isLoggedIn,
      role: loggedUser.role, // ⭐ IMPORTANT

      user,
      matkaUnsettled,
      allSettledBets,

      source: source || "",
      start: start || "",
      end: end || "",
    });
  } catch (err) {
    console.error("Bet History Error:", err);
    return res.status(500).send("Server error");
  }
};


exports.getOpretorSeeUsersAccountStatement = async (req, res, next) => {
  try {
    // 1️⃣ SESSION CHECK
    if (!req.session.isLoggedIn || !req.session.user) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    const operator = await User.findById(req.session.user._id);
    if (!operator || !["admin", "master", "agent"].includes(operator.role)) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    // 2️⃣ TARGET USER VALIDATION
    const userId = req.params.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid user ID");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    // 3️⃣ ROLE-BASED ACCESS
    if (operator.role !== "admin" && user.referredBy !== operator.referCode) {
      return res.status(403).send(
        "Access denied: You can only view your own downline users"
      );
    }

    // -------------------------
    // 🔍 Read filters
    // -------------------------
    const { source, start, end } = req.query;
    let filter = { userId };

    // -------------------------
    // 🟢 Manual Date Range
    // -------------------------
    if (start && end) {
      filter.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end + "T23:59:59"),
      };
    }
    // -------------------------
    // 🟡 Data Source Filter
    // -------------------------
    else if (source === "live") {
      filter.createdAt = {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };
    } else if (source === "backup") {
      filter.createdAt = {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
    } else if (source === "old") {
      filter.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    // -------------------------
    // 📌 Fetch Transaction History
    // -------------------------
    const history = await AdminTransactionHistory.find(filter).sort({
      createdAt: -1,
    });

    // -------------------------
    // 🔥 Render Page
    // -------------------------
    res.render("opretorseeuseraccountstatement", {
      user,
      operator,
      username: operator.username,
      wallet: operator.wallet,
      referCode: operator.referCode,
      isLoggedIn: req.session.isLoggedIn,

      // Return values to EJS
      source: source || "",
      start: start || "",
      end: end || "",

      history,
    });
  } catch (err) {
    console.log("Error in getAccountSettlement:", err);
    res.status(500).send("Server Error");
  }
};



async function getDownlineUserIds(loginUser) {
  let ids = [];

  if (loginUser.role === "admin") {
    const masters = await User.find({ role: "master" });
    const agents  = await User.find({ role: "agent" });
    const users   = await User.find({ role: "user" });

    ids = [
      loginUser._id,
      ...masters.map(m => m._id),
      ...agents.map(a => a._id),
      ...users.map(u => u._id),
    ];

  } else if (loginUser.role === "master") {
    const agents = await User.find({
      role: "agent",
      referredBy: loginUser.referCode
    });

    const users = await User.find({
      role: "user",
      referredBy: { $in: agents.map(a => a.referCode) }
    });

    ids = [
      loginUser._id,
      ...agents.map(a => a._id),
      ...users.map(u => u._id)
    ];

  } else if (loginUser.role === "agent") {
    const users = await User.find({
      role: "user",
      referredBy: loginUser.referCode
    });

    ids = [
      loginUser._id,
      ...users.map(u => u._id)
    ];
  }

  return ids;
}

exports.getAccountOfAllOpretorsStatement = async (req, res) => {
  try {
    // ---------------- AUTH ----------------
    if (!req.session?.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const loginUser = await User.findById(req.session.user._id);
    if (!loginUser) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    const role = loginUser.role; // admin | master | agent

    // ---------------- DATE FILTER ----------------
    let { source, start, end } = req.query;
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    let startDate, endDate;

    if (source === "live") {
      endDate = new Date(Date.now() + IST_OFFSET);
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (source === "backup") {
      endDate = new Date(Date.now() + IST_OFFSET);
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (source === "old") {
      endDate = new Date(Date.now() + IST_OFFSET);
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (start && end) {
      startDate = new Date(`${start}T00:00:00.000+05:30`);
      endDate = new Date(`${end}T23:59:59.999+05:30`);
    } else {
      startDate = new Date("2000-01-01");
      endDate = new Date(Date.now() + IST_OFFSET);
    }


    // ---------------- TRANSACTION HISTORY ----------------
const allowedIds = await getDownlineUserIds(loginUser);

const history = await AdminTransactionHistory.find({
  createdAt: { $gte: startDate, $lte: endDate },

  $or: [
    { adminId: { $in: allowedIds } },
    { userId:  { $in: allowedIds } }
  ]
})
.populate("adminId", "username role")
.populate("userId", "username role")
.sort({ createdAt: -1 });




    // ---------------- RENDER ----------------
    res.render("accountstatementofoperators", {
      username: loginUser.username, // 👈 ADD THIS
      wallet: loginUser.wallet,
      loginUser,
      role,
      history,
      source: source || "",
      start: start || "",
      end: end || "",
      isLoggedIn: true
    });

  } catch (err) {
    console.log("Account Statement Error:", err);
    res.redirect("/");
  }
};


exports.getMasterDownlineList = async (req, res, next) => {
  try {
    // ✅ Check if admin is logged in
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const loggedUser = await User.findById(req.session.user._id);
    if (!loggedUser || loggedUser.role !== "admin") {
      return req.session.destroy(() => res.redirect("/login"));
    }

    // 🟢 Map frontend dropdown to DB values
    const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
    const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
    const statusValue = statusMap[statusFilter] || "active"; // fallback to active

    // 🟢 Fetch users based on filter
    const allUsers = await User.find({
      role: "master",
      userStatus: statusValue,
    }).sort({ createdAt: -1 });

    // 🟢 Render page
    res.render("masterdownline", {
      username: loggedUser.username,
      wallet: loggedUser.wallet,
      referCode: loggedUser.referCode,
      user: loggedUser,
      users: allUsers,
      errors: [],
      isLoggedIn: req.session.isLoggedIn,
      oldInput: { username: "", password: "" },
      selectedStatus: statusFilter,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.postAdmincreatemaster = [
  // Validation checks
  check("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .custom(async (value) => {
      const existingUser = await User.findOne({ username: value });
      if (existingUser) throw new Error("Username already in use");
      return true;
    }),
  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  check("confirmPassword")
    .notEmpty()
    .withMessage("Confirm Password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password)
        throw new Error("Passwords do not match");
      return true;
    }),
  check("referCode").trim().notEmpty().withMessage("Referral code is required"),

  // Controller logic
  async (req, res, next) => {
    // 🟢 Map frontend dropdown to DB values
    const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
    const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
    const statusValue = statusMap[statusFilter] || "active"; // fallback to active
    // 1️⃣ Check admin
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const currentUser = await User.findById(req.session.user._id);
    if (!currentUser || currentUser.role !== "admin") {
      return res
        .status(403)
        .send("Unauthorized: Only admin can create masters");
    }

    const errors = validationResult(req);
    const { username, password, referCode } = req.body;

    const renderWithErrors = async (errorsArr, oldInput = {}) => {
      const allUsers = await User.find({
        role: "master",
        userStatus: statusValue,
      }).sort({
        createdAt: -1,
      });
      return res.status(400).render("masterdownline", {
        username: req.session.user.username,
        wallet: req.session.user.wallet,
        referCode: req.session.user.referCode,
        user: req.session.user,
        users: allUsers,
        isLoggedIn: req.session.isLoggedIn,
        errors: errorsArr,
        oldInput,
        openModal: true,
        selectedStatus: statusFilter,
      });
    };

    if (!errors.isEmpty())
      return renderWithErrors(
        errors.array().map((e) => e.msg),
        { username, password }
      );

    try {
      // 2️⃣ Check duplicate username (extra safety)
      const existingUser = await User.findOne({ username });
      if (existingUser)
        return renderWithErrors(["Username already exists"], {
          username,
          password,
        });

      // 3️⃣ Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4️⃣ Generate unique refer code
      let newUserReferCode;
      do {
        newUserReferCode = Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase();
      } while (await User.findOne({ referCode: newUserReferCode }));

      // 5️⃣ Create master
      const newUser = new User({
        username,
        password: hashedPassword,
        referCode: newUserReferCode,
        referredBy: referCode,
        role: "master",
      });

      await newUser.save();
      res.redirect("/masterpanelbyadmindashboard");
    } catch (err) {
      console.error("Registration Error:", err);
      res.status(500).send("Server Error");
    }
  },
];


// Agent
exports.getAgentPanelDashboard = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    const loggedUser = await User.findById(req.session.user._id);
    if (!loggedUser || !["admin", "master"].includes(loggedUser.role)) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    // 🟢 Status filter
    const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
    const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
    const statusValue = statusMap[statusFilter] || "active";

    // 🟢 Base query
    let query = {
      role: "agent",
      userStatus: statusValue,
      referredBy: loggedUser.referCode, // 🔥 restrict all roles to own referrals
    };

    const users = await User.find(query).sort({ createdAt: -1 });

    res.render("agentdownline", {
      username: loggedUser.username,
      wallet: loggedUser.wallet,
      referCode: loggedUser.referCode,
      user: loggedUser,
      users,
      errors: [],
      isLoggedIn: true,
      oldInput: {},
      selectedStatus: statusFilter,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


exports.postAdminandMastercreatagent = [
  /* ================= VALIDATION ================= */

  check("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3 }).withMessage("Username must be at least 3 characters")
    .custom(async value => {
      const exist = await User.findOne({ username: value });
      if (exist) throw new Error("Username already exists");
      return true;
    }),

  check("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

  check("confirmPassword")
    .notEmpty().withMessage("Confirm Password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("referCode")
    .trim()
    .notEmpty()
    .withMessage("Referral code is required"),

  /* ================= CONTROLLER ================= */

  async (req, res) => {
    try {
      /* 🔐 SESSION CHECK */
      if (!req.session?.isLoggedIn || !req.session.user) {
        return res.redirect("/login");
      }

      const currentUser = await User.findById(req.session.user._id);

      /* 🔐 ROLE CHECK (ADMIN + MASTER ONLY) */
      if (!currentUser || !["admin", "master"].includes(currentUser.role)) {
        return res.status(403).send("Unauthorized access");
      }

      const errors = validationResult(req);
      const { username, password, referCode } = req.body;

      /* 🟢 STATUS FILTER (for render) */
      const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
      const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
      const statusValue = statusMap[statusFilter] || "active";

      /* ❌ ERROR RENDER */
      const renderWithErrors = async (errorArr, oldInput = {}) => {
        let query = {
          role: "agent",
          userStatus: statusValue,
        };

        if (currentUser.role !== "admin") {
          query.referredBy = currentUser.referCode;
        }

        const users = await User.find(query).sort({ createdAt: -1 });

        return res.status(400).render("agentdownline", {
          username: currentUser.username,
          wallet: currentUser.wallet,
          referCode: currentUser.referCode,
          user: currentUser,
          users,
          errors: errorArr,
          oldInput,
          openModal: true,
          isLoggedIn: true,
          selectedStatus: statusFilter,
        });
      };

      if (!errors.isEmpty()) {
        return renderWithErrors(
          errors.array().map(e => e.msg),
          { username }
        );
      }

      /* 🔐 REFER CODE SECURITY CHECK */
      if (
        currentUser.role === "master" &&
        referCode !== currentUser.referCode
      ) {
        return renderWithErrors(["Invalid referral code"]);
      }

      /* 🔐 PASSWORD HASH */
      const hashedPassword = await bcrypt.hash(password, 10);

      /* 🔐 UNIQUE REFER CODE */
      let newReferCode;
      do {
        newReferCode = Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase();
      } while (await User.findOne({ referCode: newReferCode }));

      /* ✅ CREATE AGENT */
      const newAgent = new User({
        username,
        password: hashedPassword,
        role: "agent",
        referCode: newReferCode,
        referredBy: referCode, // 🔥 validated
        userStatus: "active",
      });

      await newAgent.save();

      return res.redirect("/agentpanelbyadmindashboard");
    } catch (err) {
      console.error("postAdminandMastercreatagent error:", err);
      return res.status(500).send("Server Error");
    }
  },
];


exports.postTransaction = async (req, res) => {
  try {
    const { userId, creditRef, deposit, withdraw, adminPassword, userStatus } = req.body;

    // ------------------------- SESSION CHECK -------------------------
    if (!req.session.isLoggedIn || !req.session.user) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    const operator = await User.findById(req.session.user._id);
    if (!operator || !["admin", "master", "agent"].includes(operator.role)) {
      return res.session.destroy(() => res.redirect("/login"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found!" });
    }

    // ------------------------- ROLE HIERARCHY -------------------------
    const roleHierarchy = {
      admin: ["master", "agent", "user"], // admin cannot transact with other admins
      master: ["agent", "user"],          // master cannot transact with other masters
      agent: ["user"],                     // agent cannot transact with other agents or master/admin
    };

    // Check if operator can manage the target user role
    if (!roleHierarchy[operator.role].includes(user.role)) {
      return res.json({
        success: false,
        message: `You are not allowed to manage this ${user.role}`,
      });
    }

    // ------------------------- DOWNLINE / REFER CODE CHECK -------------------------
    if (operator.role !== "admin" && user.referredBy !== operator.referCode) {
      return res.json({
        success: false,
        message: "You are only allowed to manage your own referred users",
      });
    }

    if (operator.role === "admin" && user.referredBy !== operator.referCode) {
      return res.json({
        success: false,
        message: "Admin can only manage their referred masters, agents, and users",
      });
    }

    // ------------------------- PASSWORD CHECK -------------------------
    if ((deposit || withdraw) && (!adminPassword || !(await bcrypt.compare(adminPassword, operator.password)))) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    // ------------------------- HELPERS -------------------------
    const getFormattedTime = () =>
      new Date().toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "numeric", second: "numeric" });

    const getFormattedDate = () => {
      const d = new Date();
      return `${d.getDate()},${d.getMonth() + 1},${d.getFullYear()}`;
    };

    // ------------------------- CREDIT REF -------------------------
    if (creditRef !== undefined) {
      const creditAmount = Number(creditRef);
      user.creditRef = creditAmount;
      user.refPl = (user.wallet || 0) - creditAmount;
    }

    // ------------------------- DEPOSIT -------------------------
    if (deposit) {
      const amount = Number(deposit);

      if (amount > operator.wallet) {
        return res.json({ success: false, message: "Insufficient balance!" });
      }

      const userBefore = user.wallet;
      const operatorBefore = operator.wallet;

      user.wallet += amount;
      operator.wallet -= amount;

      if (user.creditRef) user.refPl = user.wallet - user.creditRef;

      await AdminTransactionHistory.create({
        userId: user._id,
        adminId: operator._id,
        type: "deposit",
        amount,
        userWalletBefore: userBefore,
        userWalletAfter: user.wallet,
        adminWalletBefore: operatorBefore,
        adminWalletAfter: operator.wallet,
        formattedTime: getFormattedTime(),
        formattedDate: getFormattedDate(),
      });
    }

    // ------------------------- WITHDRAW -------------------------
    if (withdraw) {
      const amount = Number(withdraw);

      if (amount > user.wallet) {
        return res.json({ success: false, message: "User has insufficient balance!" });
      }

      const userBefore = user.wallet;
      const operatorBefore = operator.wallet;

      user.wallet -= amount;
      operator.wallet += amount;

      if (user.creditRef) user.refPl = user.wallet - user.creditRef;

      await AdminTransactionHistory.create({
        userId: user._id,
        adminId: operator._id,
        type: "withdraw",
        amount,
        userWalletBefore: userBefore,
        userWalletAfter: user.wallet,
        adminWalletBefore: operatorBefore,
        adminWalletAfter: operator.wallet,
        formattedTime: getFormattedTime(),
        formattedDate: getFormattedDate(),
      });
    }

    // ------------------------- STATUS UPDATE -------------------------
    if (userStatus && ["active", "suspended"].includes(userStatus.toLowerCase())) {
      user.userStatus = userStatus.toLowerCase();
    }

    await user.save();
    await operator.save();

    return res.json({ success: true, message: "Transaction successful" });

  } catch (err) {
    console.error("postTransaction error:", err);
    return res.json({ success: false, message: "Server Error!" });
  }
};

exports.getMasterLink = async (req, res) => {
  try {
    // 🔐 Admin auth
    if (!req.session?.isLoggedIn || !req.session.user) {
      return req.session.destroy(() => res.redirect("/login"));
    }

    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
      return req.session.destroy(() => res.redirect("/login"));
    }

    const masterId = req.params.userId;

    // 🧑 master
    const master = await User.findById(masterId);
    if (!master || master.role !== "master") {
      return res.redirect("/masterlinks");
    }


    // 🟢 Map frontend dropdown to DB values
    const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
    const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
    const statusValue = statusMap[statusFilter] || "active"; // fallback to active



    //👥 Direct users of master
    const directUsers = await User.find({
      role: "user",
      referredBy: master.referCode,
      userStatus: statusValue,
    });

    // 🕴️ Agents of master
    const agents = await User.find({
      role: "agent",
       userStatus: statusValue,
      referredBy: master.referCode,
    });

    // (optional) users of agents
    const agentUsers = await User.find({
      role: "user",
       userStatus: statusValue,
      referredBy: { $in: agents.map(a => a.referCode) },
    });

    // ✅ render single page
    res.render("masterLinks", {
      username: admin.username,
      wallet: admin.wallet,
      user: admin,

      master,
      directUsers,
      agents,
      agentUsers,

      directUserCount: directUsers.length,
      agentCount: agents.length,
      agentUserCount: agentUsers.length,
selectedStatus: statusFilter,
      isLoggedIn: true,
    });

  } catch (err) {
    console.log("getMasterLink error:", err);
    res.redirect("/masterlinks");
  }
};
