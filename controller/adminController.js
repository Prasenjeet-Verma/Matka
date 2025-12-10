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

    const user = await User.findById(req.session.user._id);

    if (!user || user.role !== "admin") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    // ADMIN sees ALL users bets
    const matkaUnsettled = await MatkaHistory.find({
      status: "unsettled",
    }).populate("userId");

    const matkaSettled = await MatkaHistory.find({
      status: "settled",
    }).populate("userId");

    const coinBets = await CoinBetHistory.find().populate("userId");

    // merge matka settled + coin bets
    const allSettledBets = [...matkaSettled, ...coinBets].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.render("adminBet", {
      username: user.username,
      wallet: user.wallet,
      referCode: user.referCode,
      user,
      isLoggedIn: req.session.isLoggedIn,

      // keep original variables
      matkaUnsettled,
      matkaSettled,
      coinBets,

      // merged for EJS
      allSettledBets,
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
  check("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long")
    .custom(async (value) => {
      const existingUser = await User.findOne({ username: value });
      if (existingUser) throw new Error("Username already in use");
      return true;
    }),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  check("confirmPassword")
    .notEmpty()
    .withMessage("Confirm Password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password)
        throw new Error("Passwords do not match");
      return true;
    }),

  check("referCode").trim().notEmpty().withMessage("Referral code is required"),

  // MAIN CONTROLLER
  async (req, res) => {
    const errors = validationResult(req);
    const { username, password, referCode } = req.body;

    if (!errors.isEmpty()) {
      const allUsers = await User.find({ role: "user" }).sort({
        createdAt: -1,
      });

      return res.status(400).render("userdownline", {
        username: req.session.user.username,
        wallet: req.session.user.wallet,
        referCode: req.session.user.referCode,
        user: req.session.user,
        users: allUsers,
        isLoggedIn: req.session.isLoggedIn,
        errors: errors.array().map((e) => e.msg),
        oldInput: { username, password },
        openModal: true,
      });
    }

    try {
      // 1️⃣ Check valid referrer (ONLY admin, master, agent)
      const referrer = await User.findOne({
        referCode: referCode,
        role: { $in: ["admin", "master", "agent"] },
      });

      if (!referrer) {
        const allUsers = await User.find({ role: "user" }).sort({
          createdAt: -1,
        });

        return res.status(400).render("userdownline", {
          username: req.session.user.username,
          wallet: req.session.user.wallet,
          referCode: req.session.user.referCode,
          user: req.session.user,
          users: allUsers,
          isLoggedIn: req.session.isLoggedIn,
          errors: errors.array().map((e) => e.msg),
          oldInput: { username, password },
          openModal: true,
        });
      }

      // 2️⃣ Check username again for safety
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        const allUsers = await User.find({ role: "user" }).sort({
          createdAt: -1,
        });

        return res.status(400).render("userdownline", {
          username: req.session.user.username,
          wallet: req.session.user.wallet,
          referCode: req.session.user.referCode,
          user: req.session.user,
          users: allUsers,
          isLoggedIn: req.session.isLoggedIn,
          errors: errors.array().map((e) => e.msg),
          oldInput: { username, password },
          openModal: true,
        });
      }

      // 3️⃣ Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4️⃣ GENERATE UNIQUE REFER CODE FOR NEW USER
      const newUserReferCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      // 5️⃣ CREATE NEW USER (role ALWAYS user)
      const newUser = new User({
        username,
        password: hashedPassword,
        referCode: newUserReferCode, // auto generated
        referredBy: referCode, // who referred new user
        role: "user", // ALWAYS user
      });

      await newUser.save();

      res.redirect("/userDownLine");
    } catch (err) {
      console.error("Registration Error:", err);
      res.status(500).send("Server Error");
    }
  },
];

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

    // admin password check only for deposit/withdraw
    if (
      (deposit || withdraw) &&
      (!adminPassword || !(await bcrypt.compare(adminPassword, admin.password)))
    ) {
      return res.json({ success: false, message: "Incorrect admin password!" });
    }

    // Credit Referral
    if (creditRef) {
      const creditAmount = Number(creditRef);
      user.creditRef = creditAmount;
      user.refPl = (user.wallet || 0) - user.creditRef;
    }

    // Deposit
    if (deposit) {
      const amount = Number(deposit);

      // ❌ Admin ke wallet me paise kam hai
      if (amount > admin.wallet) {
        return res.json({
          success: false,
          message: "Admin has insufficient balance!",
        });
      }

      // User ko credit
      user.wallet += amount;

      // Admin se balance cut
      admin.wallet -= amount;

      if (user.creditRef) user.refPl = user.wallet - user.creditRef;
    }

    // Withdraw
    if (withdraw) {
      const amount = Number(withdraw);

      // ❌ User ke wallet me paise kam hai
      if (amount > user.wallet) {
        return res.json({
          success: false,
          message: "User has insufficient balance!",
        });
      }

      // User se cut
      user.wallet -= amount;

      // Admin me add
      admin.wallet += amount;

      if (user.creditRef) user.refPl = user.wallet - user.creditRef;
    }

    // ✅ User Status Update
    if (
      userStatus &&
      ["active", "suspended"].includes(userStatus.toLowerCase())
    ) {
      user.userStatus = userStatus.toLowerCase();
    }

    await user.save();
    await admin.save(); // IMPORTANT: Save admin wallet update too
    return res.json({ success: true, message: "Successful Submit " });
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
    // 1) Check admin session
    if (!req.session || !req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== "admin") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // 2) Get userId from params
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid user ID");
    }

    // 3) Get target user
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    // 4) Fetch this user's MATKA bets
    const matkaUnsettled = await MatkaHistory.find({
      userId,
      status: "unsettled",
    })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

    const matkaSettled = await MatkaHistory.find({
      userId,
      status: "settled",
    })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

    const coinBets = await CoinBetHistory.find({
      userId,
    })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

    // 6) Merge settled bets (matka + coin)
    const allSettledBets = [...matkaSettled, ...coinBets].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // 7) Render with same EJS variables as main admin bet page
    res.render("adminOneUserBet", {
      username: admin.username,
      wallet: admin.wallet,
      referCode: admin.referCode,
      isLoggedIn: req.session.isLoggedIn,

      user, // selected user
      admin: req.session.user,

      matkaUnsettled,
      allSettledBets,
    });
  } catch (error) {
    console.error("Error fetching specific user bet history:", error);
    res.status(500).send("Server error");
  }
};
