const User = require("../model/user");
const CoinBetHistory = require("../model/coinGame"); // <-- coin game model
const bcrypt = require("bcryptjs");

// ✅ Dashboard Page Controller
exports.getDashboardPage = async (req, res, next) => {
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

    // 3️⃣ Render dashboard EJS with user data
    res.render("user", {
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,
      user: user,
      isLoggedIn: req.session.isLoggedIn,
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
      return res.redirect("/");
    }
    // 2️⃣ Fetch fresh user data from DB (in case of updates)
    const user = await User.findById(req.session.user._id);

    if (!user) {  
      req.session.destroy(() => {
        res.redirect("/login");
      }
      );
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
      return res.redirect("/");
    }
    // 2️⃣ Fetch fresh user data from DB (in case of updates)
    const user = await User.findById(req.session.user._id);

    if (!user) {
      req.session.destroy(() => {
        res.redirect("/login");
      }
      );
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
      return res.redirect("/");
    }
    // 2️⃣ Fetch fresh user data from DB (in case of updates)
    const user = await User.findById(req.session.user._id);

    if (!user) {  
      req.session.destroy(() => {
        res.redirect("/login");
      } 
      );
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
      return res.redirect("/");
    }
    // 2️⃣ Fetch fresh user data from DB (in case of updates)
    const user = await User.findById(req.session.user._id);
    if (!user) {
      req.session.destroy(() => {
        res.redirect("/login");
      }
      );
      return;
    }
    // 3️⃣ Render Account EJS with user data
    res.render("account", {
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,
      user: user,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("❌ Account Page Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.getBetsPage = async (req, res, next) => {
  try {
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/");
    }

    const user = await User.findById(req.session.user._id);

    if (!user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // 🪙 Fetch COIN GAME settled bet history
    const coinBets = await CoinBetHistory.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    // 📌 Send both data separately
    res.render("bets", {
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,

      bets: user.bets || [],           // Unsettled old matka bets
      coinBets: coinBets || [],        // Settled coin game bets

      user,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("❌ Bets Page Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.logoutUser = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {  
      console.error("❌ Logout Error:", err);
      return res.status(500).send("Server Error");
    }
    res.redirect("/login");
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
      return res.json({ success: false, message: "New passwords do not match." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Old password is incorrect." });
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
