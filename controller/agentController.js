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
      role: { $in: ["agent", "user"] },
    });

    res.render("masterpaneldashboard", {
      username: user.username,
      wallet: user.wallet,
      user,
      visibleUsers,
      isLoggedIn: req.session.isLoggedIn,
    });

  } catch (err) {
    console.error("❌ Master Dashboard Error:", err);
    res.status(500).send("Server Error");
  }
};