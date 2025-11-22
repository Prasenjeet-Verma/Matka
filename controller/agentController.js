const User = require("../model/user");

exports.getAgentPanelDashboard = async (req, res) => {
  try {
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (!user || user.role !== "agent") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // ⭐ MASTER CAN SEE: master + agent + user
    const visibleUsers = await User.find({
      role: { $in: ["user"] },
    });

  if (user.role === "agent") {
      // 2️⃣ Render admin dashboard EJS with user data
      res.render("adminpaneldashboard", {
        username: user.username,
        wallet: user.wallet, // ⭐ FIX
        user: user,
        isLoggedIn: req.session.isLoggedIn,
        visibleUsers,
      });
    } else {
      res.status(403).send("Access Denied");
      return;
    }

  } catch (err) {
    console.error("❌ Master Dashboard Error:", err);
    res.status(500).send("Server Error");
  }
};