const User = require("../model/user");
const MatkaHistory = require("../model/matkaBetHistory");
const CoinBetHistory = require("../model/coinGame");
const MatkaResult = require("../model/MatkaResult"); // import at top
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt"); // to verify admin password



exports.getMasterPanelDashboard = async (req , res,next) => {
    try {
        // 1️⃣ Check admin login session
        if (!req.isLoggedIn || !req.session.user) {
          return res.redirect("/login");
        }
        const user = await User.findById(req.session.user._id);
    
        if (!user || user.role !== "master") {
          req.session.destroy(() => {
            res.redirect("/login");
          });
          return;
        }
    
        const visibleUsers = await User.find({
          role: { $in: ["agent", "user"] },
        });
    
        if (user.role === "master") {
          // 2️⃣ Render admin dashboard EJS with user data
          res.render("masterFolder/masterPanelDashboard", {
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
        console.error("❌ Master Dashboard Error:", err);
        res.status(500).send("Server Error");
      }
}

