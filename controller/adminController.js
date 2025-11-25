const User = require("../model/user");
const MatkaHistory = require("../model/matkaBetHistory");
const CoinBetHistory = require("../model/coinGame");

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

    // ADMIN sees ALL bets of all users
    const matkaUnsettled = await MatkaHistory.find({
      status: "unsettled",
    }).populate("userId");

    const matkaSettled = await MatkaHistory.find({
      status: "settled",
    }).populate("userId");

    const coinBets = await CoinBetHistory.find().populate("userId");

    res.render("adminBet", {
      username: user.username,
      wallet: user.wallet,
      referCode: user.referCode,
      user,
      isLoggedIn: req.session.isLoggedIn,

      // SAME variable names for EJS
      matkaUnsettled,
      matkaSettled,
      coinBets,
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
        const key = bet.number;
        if (!single[key]) single[key] = { totalAmount: 0, usersCount: 0 };
        single[key].totalAmount += bet.amount;
        single[key].usersCount += 1;
      }
    });

    bets.forEach((bet) => {
      if (bet.gameName === "Patti") {
        const under = bet.underNo; // example: 9
        const num = bet.number; // example: 900, 909, 987

        if (!patti[under]) {
          patti[under] = {
            numbers: {}, // store numbers inside under
          };
        }

        // Check if this number exists inside under
        if (!patti[under].numbers[num]) {
          patti[under].numbers[num] = {
            totalAmount: 0,
            usersCount: 0,
          };
        }

        // Add user amount
        patti[under].numbers[num].totalAmount += bet.amount;

        // Count this user
        patti[under].numbers[num].usersCount += 1;
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

// exports.settleMatka = async (req, res) => {
//   try {
//     const { matkaNo, winningNumber } = req.body;

//     const bets = await MatkaBetHistory.find({
//       matkaNo,
//       status: "unsettled"
//     });

//     for (let bet of bets) {
//       const isWin = bet.number == winningNumber;
//       const result = isWin ? "WIN" : "LOSS";
//       const profit = isWin ? bet.amount * 9 : -bet.amount;

//       // Update bet status
//       await MatkaBetHistory.findByIdAndUpdate(bet._id, {
//         status: "settled",
//         result,
//         profit
//       });

//       // If win → add money
//       if (isWin) {
//         await User.findByIdAndUpdate(bet.userId, {
//           $inc: { wallet: profit }
//         });
//       }
//     }

//     res.json({ success: true, message: "Matka Settled Successfully" });

//   } catch (err) {
//     console.log(err);
//     res.json({ success: false, message: "Server Error" });
//   }
// };
