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

exports.getAdminBetPage = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
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
    const matkaUnsettled = await MatkaHistory.find({
      status: "unsettled",
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("userId");

    const matkaSettled = await MatkaHistory.find({
      status: "settled",
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("userId");

    const coinBets = await CoinBetHistory.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("userId");

    const allSettledBets = [...matkaSettled, ...coinBets].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.render("adminBet", {
      username: admin.username,
      wallet: admin.wallet,
      referCode: admin.referCode,
      user: admin,
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

exports.getUserDownLine = async (req, res, next) => {
  try {
    // ✅ Check if admin is logged in
    if (!req.session.isLoggedIn || !req.session.user) {
      return req.session.destroy(() => res.redirect("/login"));
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
      role: "user",
      userStatus: statusValue,
    }).sort({ createdAt: -1 });

    // 🟢 Render page
    res.render("userdownline", {
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

exports.postAdmincreateuser = [
  // ================= VALIDATION =================
  check("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .custom(async (value) => {
      if (await User.findOne({ username: value })) {
        throw new Error("Username already in use");
      }
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
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("referCode").trim().notEmpty().withMessage("Referral code is required"),

  // ================= CONTROLLER =================
  async (req, res) => {
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

    const errors = validationResult(req);
    const { username, password, referCode } = req.body;

    const renderError = async (msgs) => {
      const allUsers = await User.find({ role: "user" }).sort({
        createdAt: -1,
      });
      return res.status(400).render("userdownline", {
        username: loggedUser.username,
        wallet: loggedUser.wallet,
        referCode: loggedUser.referCode,
        user: loggedUser,
        users: allUsers,
        isLoggedIn: true,
        errors: msgs,
        oldInput: { username },
        openModal: true,
      });
    };

    if (!errors.isEmpty()) {
      return renderError(errors.array().map((e) => e.msg));
    }

    try {
      /* 🔐 REFER CODE OWNERSHIP CHECK */
      const referrer = await User.findOne({
        referCode,
        role: { $in: ["admin", "master", "agent"] },
      });

      if (!referrer) {
        return renderError(["Invalid referral code"]);
      }

      // 🚫 Prevent using someone else's referCode
      if (
        loggedUser.role !== "admin" &&
        referrer._id.toString() !== loggedUser._id.toString()
      ) {
        return renderError(["You cannot use another user's referral code"]);
      }

      /* 🔐 PASSWORD HASH */
      const hashedPassword = await bcrypt.hash(password, 10);

      /* 🔐 UNIQUE REFER CODE */
      let newUserReferCode;
      do {
        newUserReferCode = Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase();
      } while (await User.findOne({ referCode: newUserReferCode }));

      /* ✅ CREATE USER */
      const newUser = new User({
        username,
        password: hashedPassword,
        referCode: newUserReferCode,
        referredBy: referCode,
        role: "user",
      });

      await newUser.save();

      return res.redirect("/userDownLine");
    } catch (err) {
      console.error("Create User Error:", err);
      return res.status(500).send("Server Error");
    }
  },
];

const AdminTransactionHistory = require("../model/AdminTransactionHistory");
exports.postTransaction = async (req, res, next) => {
  try {
    const {
      userId,
      wallet,
      creditRef,
      deposit,
      withdraw,
      adminPassword,
      userStatus,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found!" });

    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // 🔐 Admin password check for deposit/withdraw
    if (
      (deposit || withdraw) &&
      (!adminPassword || !(await bcrypt.compare(adminPassword, admin.password)))
    ) {
      return res.json({ success: false, message: "Incorrect admin password!" });
    }

    // Helper: formatted time/date
    function getFormattedTime() {
      return new Date().toLocaleTimeString("en-US", {
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    }

    function getFormattedDate() {
      const d = new Date();
      return `${d.getDate()},${d.getMonth() + 1},${d.getFullYear()}`;
    }

    // ✔ CREDIT REF
    if (creditRef) {
      const creditAmount = Number(creditRef);
      user.creditRef = creditAmount;
      user.refPl = (user.wallet || 0) - user.creditRef;
    }

    // -----------------------------
    // ✔ DEPOSIT
    // -----------------------------
    if (deposit) {
      const amount = Number(deposit);

      if (amount > admin.wallet) {
        return res.json({
          success: false,
          message: "Admin has insufficient balance!",
        });
      }

      const userBefore = user.wallet;
      const adminBefore = admin.wallet;

      user.wallet += amount;
      admin.wallet -= amount;

      if (user.creditRef) user.refPl = user.wallet - user.creditRef;

      // Save history
      await AdminTransactionHistory.create({
        userId: user._id,
        adminId: admin._id,
        type: "deposit",
        amount,
        userWalletBefore: userBefore,
        userWalletAfter: user.wallet,
        adminWalletBefore: adminBefore,
        adminWalletAfter: admin.wallet,
        formattedTime: getFormattedTime(),
        formattedDate: getFormattedDate(),
      });
    }

    // -----------------------------
    // ✔ WITHDRAW
    // -----------------------------
    if (withdraw) {
      const amount = Number(withdraw);

      if (amount > user.wallet) {
        return res.json({
          success: false,
          message: "User has insufficient balance!",
        });
      }

      const userBefore = user.wallet;
      const adminBefore = admin.wallet;

      user.wallet -= amount;
      admin.wallet += amount;

      if (user.creditRef) user.refPl = user.wallet - user.creditRef;

      // Save history
      await AdminTransactionHistory.create({
        userId: user._id,
        adminId: admin._id,
        type: "withdraw",
        amount,
        userWalletBefore: userBefore,
        userWalletAfter: user.wallet,
        adminWalletBefore: adminBefore,
        adminWalletAfter: admin.wallet,
        formattedTime: getFormattedTime(),
        formattedDate: getFormattedDate(),
      });
    }

    // ✔ User Status Update
    if (
      userStatus &&
      ["active", "suspended"].includes(userStatus.toLowerCase())
    ) {
      user.userStatus = userStatus.toLowerCase();
    }

    await user.save();
    await admin.save();

    return res.json({ success: true, message: "Successful Submit" });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Server Error!" });
  }
};

const mongoose = require("mongoose");

exports.getUserProfieByAdmin = async (req, res, next) => {
  try {
    // 1️⃣ Check admin login session (use session flag consistently)
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return req.session
        ? req.session.destroy(() => res.redirect("/login"))
        : res.redirect("/login");
    }

    const Adminuser = await User.findById(req.session.user._id);
    if (!Adminuser || Adminuser.role !== "admin") {
      return req.session.destroy(() => res.redirect("/login"));
    }

    // 2️⃣ Validate userId param
    const userId = req.params.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("User ID not provided or invalid");
    }

    // 3️⃣ Fetch user details using ID
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    // 4️⃣ Render with both admin + user data
    res.render("adminSeeUserProfile", {
      user,
      username: Adminuser.username,
      wallet: Adminuser.wallet,
      referCode: Adminuser.referCode,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("getUserProfieByAdmin error:", err);
    res.status(500).send("Server error");
  }
};

const SALT_ROUNDS = 10;

exports.adminChangePasswordofUser = async (req, res) => {
  try {
    // 1) Check admin session and role
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    // 2) Validate input
    const { userId, newPassword, confirmNewPassword } = req.body;
    if (!userId)
      return res.json({ success: false, message: "No user ID provided" });
    if (!newPassword || !confirmNewPassword)
      return res.json({ success: false, message: "All fields are required" });
    if (newPassword !== confirmNewPassword)
      return res.json({ success: false, message: "Passwords do not match" });
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // 3) Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.json({ success: false, message: "Invalid user ID" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser)
      return res.json({ success: false, message: "User not found" });

    // 4) Hash new password
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 5) Update user password
    await User.findByIdAndUpdate(userId, { password: hashed });

    // Optional: log the change (to DB or console) for audit
    console.log(
      `Admin ${admin.username} (${admin._id}) changed password for user ${
        targetUser.username
      } (${userId}) at ${new Date().toISOString()}`
    );

    // Optional: Invalidate user's sessions if using server-stored sessions (implementation depends on your session store)

    return res.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (err) {
    console.error("adminChangePasswordofUser error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

exports.adminSeeUserPersonallyBetHistory = async (req, res, next) => {
  try {
    // Authentication
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid user ID");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    // -------------------------------------
    //  FIXED FILTER (IST + EXACT MATCH)
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
    //  FIXED DB FILTER (UTC STORE + IST RANGE)
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
    //  RENDER
    // -------------------------------------
    res.render("adminOneUserBet", {
      username: admin.username,
      wallet: admin.wallet,
      referCode: admin.referCode,
      isLoggedIn: req.session.isLoggedIn,

      user,
      matkaUnsettled,
      allSettledBets,

      source: source || "",
      start: start || "",
      end: end || "",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
};

exports.getAccountSettlement = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const Adminuser = await User.findById(req.session.user._id);
    if (!Adminuser || Adminuser.role !== "admin") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(400).send("User not found");

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
    res.render("accountSettlement", {
      user,
      username: Adminuser.username,
      wallet: Adminuser.wallet,
      referCode: Adminuser.referCode,
      isLoggedIn: req.session.isLoggedIn,

      // Return values to EJS
      source: source || "",
      start: start || "",
      end: end || "",

      history,
    });
  } catch (err) {
    console.log("Error in getAccountSettlement:", err);
    next(err);
  }
};

exports.getAdminAccountStatement = async (req, res, next) => {
  try {
    // ---------------- AUTH ----------------
    if (!req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // ---------------- FILTER ----------------
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

    // ---------------- FETCH HISTORY ----------------
    const history = await AdminTransactionHistory.find({
      adminId: admin._id,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

    // ---------------- RENDER ----------------
    res.render("adminaccountstatement", {
      username: admin.username,
      wallet: admin.wallet,
      referCode: admin.referCode,
      isLoggedIn: req.session.isLoggedIn,

      history,

      source: source || "",
      start: start || "",
      end: end || "",
    });
  } catch (err) {
    console.log("Admin Account Statement Error:", err);
    res.redirect("/");
  }
};

// exports.getMasterDownlineList = async (req, res) => {
//   try {
//     // ================= AUTH =================
//     if (!req.session?.isLoggedIn || !req.session?.user) {
//       return req.session.destroy(() => res.redirect("/login"));
//     }

//     const admin = await User.findById(req.session.user._id).lean();
//     if (!admin || admin.role !== "admin") {
//       return req.session.destroy(() => res.redirect("/login"));
//     }

//     // ================= STATUS FILTER =================
//     const statusMap = {
//       ACTIVE: "active",
//       INACTIVE: "suspended",
//     };

//     const selectedStatus = (req.query.status || "ACTIVE").toUpperCase();
//     const statusValue = statusMap[selectedStatus] || "active";

//     // ================= FETCH MASTERS =================
//     const masters = await User.find(
//       { role: "master", userStatus: statusValue },
//       {
//         username: 1,
//         wallet: 1,
//         creditRef: 1,
//         refPl: 1,
//         referCode: 1,
//         userStatus: 1,
//         createdAt: 1,
//       }
//     )
//       .sort({ createdAt: -1 })
//       .lean();

//     // ================= DOWNLINE COUNTS =================
//     const mastersWithCounts = await Promise.all(
//       masters.map(async (m) => {
//         const [totalAgents, totalUsers] = await Promise.all([
//           User.countDocuments({ role: "agent", referredBy: m.referCode }),
//           User.countDocuments({ role: "user", referredBy: m.referCode }),
//         ]);

//         return {
//           ...m,
//           totalAgents,
//           totalUsers,
//         };
//       })
//     );

//     // ================= RENDER =================
//     res.render("masterDownline", {
//       username: admin.username,
//       wallet: admin.wallet,
//       referCode: admin.referCode,
//       user: admin,
//       isLoggedIn: true,

//       masters: mastersWithCounts,
//       selectedStatus,

//       // ✅✅ YAHI MISSING THA
//       oldInput: {
//         username: "",
//         password: "",
//         creditRef: "",
//       },

//       errors: [],
//     });
//   } catch (err) {
//     console.error("❌ Master Downline Error:", err);
//     res.status(500).send("Server Error");
//   }
// };

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
      const allUsers = await User.find({ role: "master" }).sort({
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

exports.postTransactionofmaster = async (req, res, next) => {
  try {
    const {
      userId,
      wallet,
      creditRef,
      deposit,
      withdraw,
      adminPassword,
      userStatus,
    } = req.body;

    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const user = await User.findById(userId);

    if (!user) return res.json({ success: false, message: "User not found!" });

    if (!user || user.role !== "master") {
      return res.json({ success: false, message: "User is not master" });
    }

    // 🔐 Admin password check for deposit/withdraw
    if (
      (deposit || withdraw) &&
      (!adminPassword || !(await bcrypt.compare(adminPassword, admin.password)))
    ) {
      return res.json({ success: false, message: "Incorrect admin password!" });
    }

    // Helper: formatted time/date
    function getFormattedTime() {
      return new Date().toLocaleTimeString("en-US", {
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    }

    function getFormattedDate() {
      const d = new Date();
      return `${d.getDate()},${d.getMonth() + 1},${d.getFullYear()}`;
    }

    // ✔ CREDIT REF
    if (creditRef) {
      const creditAmount = Number(creditRef);
      user.creditRef = creditAmount;
      user.refPl = (user.wallet || 0) - user.creditRef;
    }

    // -----------------------------
    // ✔ DEPOSIT
    // -----------------------------
    if (deposit) {
      const amount = Number(deposit);

      if (amount > admin.wallet) {
        return res.json({
          success: false,
          message: "Admin has insufficient balance!",
        });
      }

      const userBefore = user.wallet;
      const adminBefore = admin.wallet;

      user.wallet += amount;
      admin.wallet -= amount;

      if (user.creditRef) user.refPl = user.wallet - user.creditRef;

      // Save history
      await AdminTransactionHistory.create({
        userId: user._id,
        adminId: admin._id,
        type: "deposit",
        amount,
        userWalletBefore: userBefore,
        userWalletAfter: user.wallet,
        adminWalletBefore: adminBefore,
        adminWalletAfter: admin.wallet,
        formattedTime: getFormattedTime(),
        formattedDate: getFormattedDate(),
      });
    }

    // -----------------------------
    // ✔ WITHDRAW
    // -----------------------------
    if (withdraw) {
      const amount = Number(withdraw);

      if (amount > user.wallet) {
        return res.json({
          success: false,
          message: "Master has insufficient balance!",
        });
      }

      const userBefore = user.wallet;
      const adminBefore = admin.wallet;

      user.wallet -= amount;
      admin.wallet += amount;

      if (user.creditRef) user.refPl = user.wallet - user.creditRef;

      // Save history
      await AdminTransactionHistory.create({
        userId: user._id,
        adminId: admin._id,
        type: "withdraw",
        amount,
        userWalletBefore: userBefore,
        userWalletAfter: user.wallet,
        adminWalletBefore: adminBefore,
        adminWalletAfter: admin.wallet,
        formattedTime: getFormattedTime(),
        formattedDate: getFormattedDate(),
      });
    }

    // ✔ User Status Update
    if (
      userStatus &&
      ["active", "suspended"].includes(userStatus.toLowerCase())
    ) {
      user.userStatus = userStatus.toLowerCase();
    }

    await user.save();
    await admin.save();

    return res.json({ success: true, message: "Successful Submit" });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Server Error!" });
  }
};

exports.getAdminSeeMasterProfile = async (req, res, next) => {
  try {
    // 1️⃣ Check admin login session (use session flag consistently)
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const Adminuser = await User.findById(req.session.user._id);
    if (!Adminuser || Adminuser.role !== "admin") {
      return req.session.destroy(() => res.redirect("/login"));
    }

    // 2️⃣ Validate userId param
    const userId = req.params.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("User ID not provided or invalid");
    }

    // 3️⃣ Fetch user details using ID
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    // 4️⃣ Render with both admin + user data
    res.render("adminSeeMasterProfile", {
      user,
      username: Adminuser.username,
      wallet: Adminuser.wallet,
      referCode: Adminuser.referCode,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("getUserProfieByAdmin error:", err);
    res.status(500).send("Server error");
  }
};

exports.getAdminSeeMasterAccountStatement = async (req, res, next) => {
  try {
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const Adminuser = await User.findById(req.session.user._id);
    if (!Adminuser || Adminuser.role !== "admin") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(400).send("User not found");

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
    res.render("adminSeeMasterAccountStatement", {
      user,
      username: Adminuser.username,
      wallet: Adminuser.wallet,
      referCode: Adminuser.referCode,
      isLoggedIn: req.session.isLoggedIn,

      // Return values to EJS
      source: source || "",
      start: start || "",
      end: end || "",

      history,
    });
  } catch (err) {
    console.log("Error in getAccountSettlement:", err);
    next(err);
  }
};

exports.adminChangePasswordofMaster = async (req, res, next) => {
  try {
    // 1) Check admin session and role
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }
    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    // 2) Validate input
    const { userId, newPassword, confirmNewPassword } = req.body;
    if (!userId)
      return res.json({ success: false, message: "No user ID provided" });
    if (!newPassword || !confirmNewPassword)
      return res.json({ success: false, message: "All fields are required" });
    if (newPassword !== confirmNewPassword)
      return res.json({ success: false, message: "Passwords do not match" });
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // 3) Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.json({ success: false, message: "Invalid user ID" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser)
      return res.json({ success: false, message: "User not found" });

    // 4) Hash new password
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 5) Update user password
    await User.findByIdAndUpdate(userId, { password: hashed });

    // Optional: log the change (to DB or console) for audit
    console.log(
      `Admin ${admin.username} (${admin._id}) changed password for user ${
        targetUser.username
      } (${userId}) at ${new Date().toISOString()}`
    );

    // Optional: Invalidate user's sessions if using server-stored sessions (implementation depends on your session store)

    return res.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (err) {
    console.error("adminChangePasswordofUser error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};
