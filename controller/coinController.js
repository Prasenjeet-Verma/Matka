const User = require("../model/user");
const BetHistory = require("../model/coinGame");  // <-- add this

exports.getDashboardPage = async (req, res) => {
  try {
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    res.render("headtail", {
      username: user.username,
      referCode: user.referCode,
      wallet: user.wallet || 0,
      user,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.postDashboard = async (req, res) => {
  try {
    if (!req.session.user || !req.isLoggedIn) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const currentUser = await User.findById(req.session.user._id);
    if (!currentUser) return res.status(401).json({ error: "Invalid user" });

    const { fixBetAmount, userChoice, timeOut, cashOut } = req.body;

    const validKeys = ["fixBetAmount", "userChoice", "timeOut", "cashOut"];
    const receivedKeys = Object.keys(req.body).filter(k => validKeys.includes(k));

    if (receivedKeys.length !== 1) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    // ---------------------- PLACE BET ----------------------
    if (fixBetAmount !== undefined) {
      const amount = Number(fixBetAmount);
      if (!amount || amount <= 0 || Number.isNaN(amount)) {
        return res.status(400).json({ error: "Bet amount must be a valid number greater than zero" });
      }

      if (amount > currentUser.wallet) {
        return res.status(400).json({ error: "Insufficient funds" });
      }

      if (currentUser.wallet <= 0) {
        currentUser.playCount = 0;
        await currentUser.save();
      }

      req.session.lastBetAmount = amount;
      req.session.totalProfit = 0;
      await new Promise((r) => req.session.save(r));

      currentUser.wallet -= amount;
      await currentUser.save();

      return res.status(200).json({
        message: "Bet Accepted",
        remainingBalance: currentUser.wallet,
      });
    }

    // ---------------------- USER PICK ----------------------
    if (userChoice !== undefined) {
      const choiceNum = Number(userChoice);
      if (![0, 180].includes(choiceNum)) {
        return res.status(400).json({ error: "Invalid choice" });
      }

      currentUser.playCount = (currentUser.playCount || 0) + 1;
      currentUser.currentUserChoiceBandS = choiceNum;
      await currentUser.save();

      return res.status(200).json({ message: "Choice saved" });
    }

    // ---------------------- TIMEOUT = FINAL RESULT ----------------------
    if (timeOut !== undefined) {
      const bet = req.session.lastBetAmount;
      if (!bet || bet <= 0) {
        return res.status(400).json({ error: "No active bet found" });
      }

      const choice = currentUser.currentUserChoiceBandS;
      if (![0, 180].includes(choice)) {
        req.session.lastBetAmount = 0;
        req.session.totalProfit = 0;
        await new Promise((r) => req.session.save(r));
        return res.status(400).json({ error: "Invalid user choice" });
      }

      const pickText = choice === 0 ? "HEAD" : "TAIL";

      // Old manipulation system — NO random!
      const wallet = currentUser.wallet;
      let isWin = false;

      if ((currentUser.playCount || 0) <= 3) isWin = true;
      else if (wallet <= 20) isWin = false;
      else isWin = Math.random() < 0.5;

      if (isWin) {
        req.session.totalProfit = (req.session.totalProfit || 0) + bet;
        await new Promise((r) => req.session.save(r));

        return res.status(200).json({
          rotation: choice,
          totalProfit: req.session.totalProfit,
        });
      } else {
        // -------- SAVE LOSS HISTORY --------
        await BetHistory.create({
          userId: currentUser._id,
          gameName: "COIN GAME",
          userPick: pickText,
          amount: bet,
          result: "LOSS",
          profit: -bet,
        });

        req.session.lastBetAmount = 0;
        req.session.totalProfit = 0;
        await new Promise((r) => req.session.save(r));

        const opposite = choice === 0 ? 180 : 0;
        return res.status(200).json({ rotation: opposite });
      }
    }

    // ---------------------- CASHOUT (FINAL WIN) ----------------------
    if (cashOut !== undefined) {
      const total = req.session.totalProfit || 0;
      if (total <= 0) {
        return res.status(400).json({ error: "Nothing to cash out" });
      }

      // SAVE WIN HISTORY
      await BetHistory.create({
        userId: currentUser._id,
        gameName: "COIN GAME",
        userPick: currentUser.currentUserChoiceBandS === 0 ? "HEAD" : "TAIL",
        amount: total,
        result: "WIN",
        profit: total,
      });

      currentUser.wallet += total;
      await currentUser.save();

      req.session.totalProfit = 0;
      req.session.lastBetAmount = 0;
      await new Promise((r) => req.session.save(r));

      return res.status(200).json({ addTotalProfit: currentUser.wallet });
    }

    return res.status(400).json({ error: "Invalid request" });

  } catch (err) {
    console.error("Coin Error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};

















// exports.getDashboardPage = async (req, res, next) => {
//   try {
//     // 1️⃣ Check login session
//     if (!req.isLoggedIn || !req.session.user) {
//       return res.redirect("/login");
//     }
//     // 2️⃣ Fetch fresh user data from DB (in case of updates)
//     const user = await User.findById(req.session.user._id);
//     if (!user) {
//       req.session.destroy(() => {
//         res.redirect("/login");
//       });
//       return;
//     }
//     // 3️⃣ Render dashboard EJS with user data
//     res.render("headtail", {
//       username: user.username,
//       referCode: user.referCode,
//       wallet: user.wallet || 0,
//       user: user,
//       isLoggedIn: req.session.isLoggedIn,
//     });
//   } catch (err) {
//     console.error("❌ Dashboard Error:", err);
//     res.status(500).send("Server Error");
//   } 
// };





// exports.postDashboard = async (req, res, next) => {
//   if (!req.session.user || !req.isLoggedIn) {
//     return res.redirect("/");
//   }

//   const currentUser = await User.findById(req.session.user._id);
//   if (!currentUser) return res.redirect("/");

//   // backend
//   const { fixBetAmount, userChoice, timeOut, cashOut } = req.body;
//   console.log("fixAmount", fixBetAmount);
//   console.log("userChoice", userChoice)
//   const isValidFixBet =
//     fixBetAmount !== undefined &&
//     userChoice === undefined &&
//     timeOut === undefined &&
//     cashOut === undefined;
//   const isValidUserChoice =
//     userChoice !== undefined &&
//     fixBetAmount === undefined &&
//     timeOut === undefined &&
//     cashOut === undefined;
//   const isValidTimeOut =
//     timeOut !== undefined &&
//     userChoice === undefined &&
//     fixBetAmount === undefined &&
//     cashOut === undefined;
//   const isValidCashOut =
//     cashOut !== undefined &&
//     fixBetAmount === undefined &&
//     userChoice === undefined &&
//     timeOut === undefined;

//   if (
//     !(isValidFixBet || isValidUserChoice || isValidTimeOut || isValidCashOut)
//   ) {
//     return res.status(200).json({}); // invalid or mixed data, ignore it
//   }

//   let amount;

//   // 💰 Subtract deposit only if a valid fixBetAmount is sent
//   if (fixBetAmount !== undefined && fixBetAmount !== null) {
//     amount = parseFloat(fixBetAmount);
//     req.session.lastBetAmount = amount;
//     req.session.totalProfit = 0;
//     req.session.save()

//     if (isNaN(amount)) {
//       return res
//         .status(400)
//         .json({ error: "Bet amount must be a valid number" });
//     }

//     if (amount <= 0) {
//       return res
//         .status(400)
//         .json({ error: "Bet amount must be greater than zero" });
//     }

//     if (amount > currentUser.wallet) {
//       return res.status(400).json({ error: "Insufficient funds" });
//     }

//     // Optional: reset playCount if user loses all deposit
//     if (currentUser.wallet <= 0) {
//       currentUser.playCount = 0;
//       await currentUser.save();
//     }

//     currentUser.wallet -= amount;
//     await currentUser.save();
//   }

//   // Fetch admin data
//   // const adminData = await Admin.findOne({ email: "admin832@gmail.com" });
//   // if (!adminData) {
//   //   return res.status(404).json({ error: "Admin data not found" });
//   // }

//   if (userChoice !== undefined && userChoice !== null) {
//     // ⏱️ Only increment play count if userChoice sent
//     currentUser.playCount = (currentUser.playCount || 0) + 1;
//     currentUser.currentUserChoiceBandS = userChoice;
//     await currentUser.save();
//   }

//   // 🎲 Only run win/lose logic if timeOut is passed (second fetch)
//   if (timeOut !== undefined && timeOut !== null) {
//     // ⛔ Protect: if amount wasn't defined in the first step
//     if (
//       typeof req.session.lastBetAmount !== "number" ||
//       req.session.lastBetAmount <= 0
//     ) {
//       return res.status(400).json({ error: "Invalid or missing bet amount" });
//     }

//     // 💡 Define win logic
//     let winChance;
//     if (currentUser.playCount <= 3) {
//       winChance = 1; // easy win at start
//     } else if (currentUser.wallet <= 20) {
//       winChance = 0.1; // hard win if low balance
//     } else {
//       winChance = 0.5;//parseFloat(adminData.winChance);
//     }

//     const shouldWin = Math.random() < winChance;
 
//     // 🪙 Rotation logic
//     let rotation;
//     if (shouldWin) {
//       req.session.totalProfit =(req.session.totalProfit || 0) + req.session.lastBetAmount;
//       req.session.save()
//       rotation = currentUser.currentUserChoiceBandS === 0 ? 0 : currentUser.currentUserChoiceBandS === 180  ? 180 : null;

//       if (rotation === null) {
//         req.session.totalProfit = 0;
//         req.session.lastBetAmount = 0;
//         req.session.save()
//         return res.status(404).json({ error: "Invalid userChoice" });
//       }

//       return res.status(200).json({
//         rotation,
//         totalProfit: req.session.totalProfit,
//       });
//     } else {
//       rotation = currentUser.currentUserChoiceBandS === 0 ? 180 : currentUser.currentUserChoiceBandS === 180 ? 0 : null;

//       if (rotation === null) {
//         req.session.totalProfit = 0;
//         req.session.lastBetAmount = 0;
//         req.session.save()
//         return res.status(404).json({ error: "Invalid userChoice" });
//       }
//       req.session.lastBetAmount = 0;
//       req.session.totalProfit = 0;
//       req.session.save()
//       return res.status(200).json({ rotation });
//     }
//   }

//   if (cashOut !== undefined && cashOut !== null) {
//     req.session.totalProfit += req.session.lastBetAmount;
//     req.session.save()
//     currentUser.wallet += req.session.totalProfit;
//     await currentUser.save();
//     req.session.totalProfit = 0;
//     req.session.lastBetAmount = 0;
//     req.session.save()
//     return res.status(200).json({ addTotalProfit: currentUser.wallet });
//   }

//   // ✅ Fallback if only placing the bet (first fetch)
//   return res.status(200).json({
//     message: "Balance updated successfully",
//     remainingBalance: currentUser.wallet,
//   });
// };



