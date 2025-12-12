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

    let { source, start, end } = req.query;
    let dateFilter = {}; // DEFAULT: no filter

    // -------------------------------------------
    // 1) MANUAL DATE FILTER (User selects dates)
    // -------------------------------------------
    if (start && end) {
      let startDate = new Date(start);
      let endDate = new Date(end);
      endDate.setHours(23, 59, 59);

      dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    }

    // -------------------------------------------
    // 2) SOURCE FILTER
    // -------------------------------------------
    else if (source === "live") {
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date();

      dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    }

    else if (source === "backup") {
      let startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date();

      dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    }

    else if (source === "old") {
      let startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date();

      dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    }

    // ---------------------------------------------------------
    // 3) DEFAULT → NO filter provided → Show TODAY IST data
    // ---------------------------------------------------------
    else if (!start && !end && !source) {

      let now = new Date();

      // Convert UTC → IST
      let ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

      // Start of day IST
      let startDate = new Date(ist);
      startDate.setHours(0, 0, 0, 0);

      // End of day IST
      let endDate = new Date(ist);
      endDate.setHours(23, 59, 59);

      // Convert back IST → UTC (MongoDB stores UTC)
      startDate = new Date(startDate.getTime() - (5.5 * 60 * 60 * 1000));
      endDate = new Date(endDate.getTime() - (5.5 * 60 * 60 * 1000));

      dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    }

    // -------------------------------------------
    // APPLY FILTER
    // -------------------------------------------
    const matkaUnsettled = await MatkaBetHistory.find({
      userId: user._id,
      status: "unsettled",
      ...dateFilter
    });

    const matkaSettled = await MatkaBetHistory.find({
      userId: user._id,
      status: "settled",
      ...dateFilter
    });

    const coinBets = await CoinBetHistory.find({
      userId: user._id,
      ...dateFilter
    });

    const allSettledBets = [...matkaSettled, ...coinBets]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.render("userBets", {
      username: user.username,
      wallet: user.wallet,
      referCode: user.referCode,
      user,
      isLoggedIn: req.session.isLoggedIn,
      matkaUnsettled,
      allSettledBets,
      source: source || "",
      start: start || "",
      end: end || "",
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
