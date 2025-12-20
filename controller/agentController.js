const User = require("../model/user");

exports.getAgentPanelDashboard = async (req , res , next ) => {
  try {
          // 1️⃣ Check admin login session
          if (!req.isLoggedIn || !req.session.user) {
            return res.redirect("/login");
          }
          const user = await User.findById(req.session.user._id);
      
          if (!user || user.role !== "agent") {
            req.session.destroy(() => {
              res.redirect("/login");
            });
            return;
          }
      
          const visibleUsers = await User.find({
            role: { $in: ["user"] },
          });
      
          if (user.role === "agent") {
            // 2️⃣ Render admin dashboard EJS with user data
            res.render("agentFolder/agentPanelDashboard", {
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
          console.error("❌ Agent Dashboard Error:", err);
          res.status(500).send("Server Error");
        }
}

