const User = require("../model/user");

exports.getAdminPanelDashboard = async (req, res, next) => {
  try {
    // 1️⃣ Check admin login session
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/adminlogin");
    }
    const user = await User.findById(req.session.user._id);

    if (!user || user.role !== "admin") {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    };

 const visibleUsers = await User.find({
      role: { $in: ["admin","master", "agent", "user"] },
    });


    // 2️⃣ Render admin dashboard EJS with user data
  res.render("adminpaneldashboard", {
  username: user.username,
  wallet: user.wallet,   // ⭐ FIX
  user: user,
  isLoggedIn: req.session.isLoggedIn,
  visibleUsers,
});

  } catch (err) {
    console.error("❌ Admin Dashboard Error:", err);
    res.status(500).send("Server Error");
  };
};

