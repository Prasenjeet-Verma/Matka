const User = require("../model/user");
const CoinBetHistory = require("../model/coinGame"); // <-- coin game model
const MatkaBetHistory = require("../model/matkaBetHistory");
const bcrypt = require("bcryptjs");

// ✅ Dashboard Page Controller
exports.getDashboardPage = async (req, res, next) => {
  try {
    // 1️⃣ Check login session
    if (!req.session.isLoggedIn || !req.session.user) {
      // Not logged in → show dashboard without user details
      return res.render("user", {
        isLoggedIn: false,
        username: null,
        wallet: 0,
        user: null,
        referCode: null,
      });
    }

    // 2️⃣ Fetch fresh user data from DB (security check: updated info)
    const user = await User.findById(req.session.user._id);

    if (!user) {
      // If user deleted or invalid session, destroy session
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    if (!user || user.role !== "user") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    // 3️⃣ Render dashboard with full data
    res.render("user", {
      isLoggedIn: true,
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,
      user: user,
    });
  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.getLiveMatkaPage = async (req, res, next) => {
  try {
    // 1️⃣ Check login session
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }
    // 2️⃣ Fetch fresh user data from DB (in case of updates)
    const user = await User.findById(req.session.user._id);

    if (!user) {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    if (!user || user.role !== "user") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    // 3️⃣ Render Live Matka EJS with user data
    res.render("livematka", {
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,
      user: user,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("❌ Live Matka Page Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.getSingleMatkaPage = async (req, res, next) => {
  try {
    // 1️⃣ Check login session
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }
    // 2️⃣ Fetch fresh user data from DB (in case of updates)
    const user = await User.findById(req.session.user._id);

    if (!user) {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    if (!user || user.role !== "user") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    // 3️⃣ Render Single Matka EJS with user data
    res.render("singlematka", {
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,
      user: user,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("❌ Single Matka Page Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.getPattiMatkaPage = async (req, res, next) => {
  try {
    // 1️⃣ Check login session
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }
    // 2️⃣ Fetch fresh user data from DB (in case of updates)
    const user = await User.findById(req.session.user._id);

    if (!user) {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    if (!user || user.role !== "user") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    // 3️⃣ Render Patti Matka EJS with user data
    res.render("pattimatka", {
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,
      user: user,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("❌ Patti Matka Page Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.getAccountPage = async (req, res, next) => {
  try {
    // 1️⃣ Check login session
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    // 2️⃣ Fetch user
    const user = await User.findById(req.session.user._id);
    if (!user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // 3️⃣ Decide which page to render based on ROLE
    if (user.role === "admin") {
      return res.render("adminAccount", {
        username: user.username,
        wallet: user.wallet || 0,
        referCode: user.referCode,
        user,
        isLoggedIn: req.session.isLoggedIn,
      });
    }

    // Normal user / agent / master ka account
    return res.render("account", {
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,
      user,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("❌ Account Page Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.getUserBetPage = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id);
    if (!user || user.role !== "user") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // ------------------- FILTER LOGIC -------------------
    let { source, start, end } = req.query;
    const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST offset in ms

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
      // IST start of day
      startDate = new Date(`${start}T00:00:00.000+05:30`);

      // IST end of day
      endDate = new Date(`${end}T23:59:59.999+05:30`);
    } else {
      startDate = new Date("2000-01-01");
      endDate = new Date(Date.now() + IST_OFFSET);
    }

    // ------------------- FETCH BETS -------------------
    const matkaUnsettled = await MatkaBetHistory.find({
      userId: user._id,
      status: "unsettled",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const matkaSettled = await MatkaBetHistory.find({
      userId: user._id,
      status: "settled",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const coinBets = await CoinBetHistory.find({
      userId: user._id,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const allSettledBets = [...matkaSettled, ...coinBets].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // ------------------- RENDER -------------------
    res.render("userBets", {
      username: user.username,
      wallet: user.wallet,
      referCode: user.referCode,
      user,
      isLoggedIn: req.session.isLoggedIn,

      matkaUnsettled,
      allSettledBets,

      source: req.query.source || "",
      start: req.query.start || "",
      end: req.query.end || "",
    });
  } catch (err) {
    console.log(err);
    res.redirect("/login");
  }
};

exports.logoutUser = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Logout Error:", err);
      return res.status(500).send("Server Error");
    }
    res.redirect("/");
  });
};

exports.postResetPassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.session.user._id;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.json({ success: false, message: "All fields are required." });
    }
    if (newPassword !== confirmNewPassword) {
      return res.json({
        success: false,
        message: "New passwords do not match.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.json({
        success: false,
        message: "Old password is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully!" });
  } catch (err) {
    console.error("❌ Reset Password Error:", err);
    res.json({ success: false, message: "Server error. Try again later." });
  }
};


const AdminTransactionHistory = require("../model/AdminTransactionHistory");
exports.getUserAccountStatement = async (req, res, next) => {
  try {
    // 🔐 Auth check
    if (!req.session.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id);
    if (!user || user.role !== "user") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // -------------------------
    // 🔍 Filters
    // -------------------------
    const { source, start, end } = req.query;

    let filter = { userId: user._id };

    // 🟢 Manual date (IST safe)
    if (start && end) {
      filter.createdAt = {
        $gte: new Date(`${start}T00:00:00.000+05:30`),
        $lte: new Date(`${end}T23:59:59.999+05:30`)
      };
    }

    // 🟡 Live 24h
    else if (source === "live") {
      filter.createdAt = {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      };
    }

    // 🔵 Last 7 days
    else if (source === "backup") {
      filter.createdAt = {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      };
    }

    // 🟣 Last 30 days
    else if (source === "old") {
      filter.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
    }

    // -------------------------
    // 📌 Fetch history
    // -------------------------
    const history = await AdminTransactionHistory
      .find(filter)
      .sort({ createdAt: -1 });

    // -------------------------
    // 🖥 Render page
    // -------------------------
    res.render("userAccountStatement", {
      user,
      history,

      username: user.username,
      wallet: user.wallet,
      referCode: user.referCode,
      isLoggedIn: req.session.isLoggedIn,

      source: source || "",
      start: start || "",
      end: end || ""
    });

  } catch (err) {
    console.error("getUserAccountStatement error:", err);
    next(err);
  }
};

