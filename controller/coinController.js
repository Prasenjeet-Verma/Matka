const User = require("../model/user");
const BetHistory = require("../model/coinGame");

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
    const receivedKeys = Object.keys(req.body).filter((k) =>
      validKeys.includes(k)
    );

    if (receivedKeys.length !== 1) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    // ---------------------- PLACE BET ----------------------
    if (fixBetAmount !== undefined) {
      const amount = Number(fixBetAmount);
      if (!amount || amount <= 0 || Number.isNaN(amount)) {
        return res.status(400).json({
          error: "Bet amount must be a valid number greater than zero",
        });
      }

      if (amount > currentUser.wallet) {
        return res.status(400).json({ error: "Insufficient funds" });
      }

      // reset playCount if wallet empty (legacy)
      if (currentUser.wallet <= 0) {
        currentUser.playCount = 0;
        await currentUser.save();
      }

      // Save bet in session and reset running profit for new bet sequence
      req.session.lastBetAmount = amount;
      req.session.totalProfit = 0;
      await new Promise((r) => req.session.save(r));

      // Deduct bet from wallet immediately
      // currentUser.wallet -= amount;
      // await currentUser.save();

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
      //Deduct bet from wallet immediately
      currentUser.wallet -= Number(req.session.lastBetAmount || 0);
      await currentUser.save();

      return res.status(200).json({ message: "Choice saved" });
    }

    // ---------------------- TIMEOUT = FINAL RESULT ----------------------
    if (timeOut !== undefined) {
      const bet = Number(req.session.lastBetAmount || 0);
      if (!bet || bet <= 0) {
        return res.status(400).json({ error: "No active bet found" });
      }

      const choice = Number(currentUser.currentUserChoiceBandS);
      if (![0, 180].includes(choice)) {
        // reset session state when user choice invalid
        req.session.lastBetAmount = 0;
        req.session.totalProfit = 0;
        await new Promise((r) => req.session.save(r));
        return res.status(400).json({ error: "Invalid user choice" });
      }

      const pickText = choice === 0 ? "HEAD" : "TAIL";

      // Old manipulation system — NO random for first few plays
      const wallet = currentUser.wallet;
      let isWin = false;

      if ((currentUser.playCount || 0) <= 3) isWin = true;
      else if (wallet <= 20) isWin = false;
      else isWin = Math.random() < 0.5;

      if (isWin) {
        const profit = bet; // 👈 User ko dikhana wala profit
        const walletAdd = bet * 2; // 👈 Wallet me add hone wala amount (casino rule)

        // SAVE HISTORY
        await BetHistory.create({
          userId: currentUser._id,
          gameName: "COIN GAME",
          userPick: pickText,
          amount: bet,
          result: "WIN",
          profit: profit, // 👈 History me profit 100 hi jayega
        });

        // UPDATE WALLET
        currentUser.wallet += walletAdd;
        await currentUser.save();

        // RESET SESSION
        req.session.lastBetAmount = 0;
        req.session.totalProfit = 0;
        await new Promise((r) => req.session.save(r));

        return res.status(200).json({
          rotation: choice,
          totalProfit: profit, // 👈 Frontend ko sirf 100 milega
          remainingBalance: currentUser.wallet,
        });
      } else {
        // LOSS: save loss history
        await BetHistory.create({
          userId: currentUser._id,
          gameName: "COIN GAME",
          userPick: pickText,
          amount: bet,
          result: "LOSS",
          profit: -bet,
        });

        // reset session
        req.session.lastBetAmount = 0;
        req.session.totalProfit = 0;
        await new Promise((r) => req.session.save(r));

        const opposite = choice === 0 ? 180 : 0;
        return res.status(200).json({
          rotation: opposite,
          totalLoss: bet,
          remainingBalance: currentUser.wallet, // wallet unchanged on loss (already deducted at bet)
        });
      }
    }

    // Fallback (shouldn't hit)
    return res.status(400).json({ error: "No recognized action in request" });
  } catch (err) {
    console.error("Coin Error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};

// Optional: route handler to explicitly reset session (used by frontend resetUI)
// exports.resetCoinGame = async (req, res) => {
//   try {
//     if (!req.session) return res.status(200).json({ ok: true });
//     req.session.lastBetAmount = 0;
//     req.session.totalProfit = 0;
//     await new Promise((r) => req.session.save(r));
//     return res.status(200).json({ ok: true });
//   } catch (err) {
//     console.error("Reset Error:", err);
//     return res.status(500).json({ error: "Server Error" });
//   }
// };

// exports.postResultPage = async (req, res) => {
// if(!req.session.user || !req.isLoggedIn) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//  req.session.lastBetAmount = 0;
//   req.session.totalProfit = 0;
//   req.session.save(() => res.json({ ok: true }));
// }
