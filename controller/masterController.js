const User = require("../model/user");

exports.getMasterPanelDashboard = async (req, res) => {
  try {
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (!user || user.role !== "master") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // ⭐ MASTER CAN SEE: master + agent + user
    const visibleUsers = await User.find({
      role: { $in: ["master", "agent", "user"] },
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
// EJS TEMPLATE SNIPPETS FOR masterpaneldashboard.ejs

// ✔ To Render All Visible Users (Masters, Agents, Users)
// <table>
//   <thead>
//     <tr>
//       <th>Username</th>
//       <th>Role</th>
//       <th>Wallet</th>
//       <th>Referral Code</th>
//     </tr>
//   </thead>

//   <tbody>
//     <% visibleUsers.forEach(u => { %>
//       <tr>
//         <td><%= u.username %></td>
//         <td><%= u.role %></td>
//         <td><%= u.wallet %></td>
//         <td><%= u.referCode %></td>
//       </tr>
//     <% }) %>
//   </tbody>
// </table>


// ✔ If You Want to Render Only Masters
// Show only masters:
// <% visibleUsers
//     .filter(u => u.role === "master")
//     .forEach(master => { %>

//     <p><%= master.username %></p>

// <% }) %>