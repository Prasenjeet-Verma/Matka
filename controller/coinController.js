const User = require("../model/user");
const BetHistory = require("../model/coinGame");

exports.getDashboardPage = async (req, res) => {
  try {
    if (!req.isLoggedIn || !req.session.user) return res.redirect("/login");

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
    if (!req.session.user || !req.isLoggedIn)
      return res.status(401).json({ error: "Unauthorized" });

    const currentUser = await User.findById(req.session.user._id);
    if (!currentUser) return res.status(401).json({ error: "Invalid user" });

    const { fixBetAmount, userChoice, timeOut } = req.body;

    // Only one action per request
    const actions = [fixBetAmount, userChoice, timeOut].filter(
      (v) => v !== undefined
    );
    if (actions.length !== 1)
      return res.status(400).json({ error: "Invalid request format" });

    // ---------------------- PLACE BET ----------------------
    if (fixBetAmount !== undefined) {
      const amount = Number(fixBetAmount);
      if (!amount || amount <= 0 || Number.isNaN(amount))
        return res.status(400).json({ error: "Bet amount must be > 0" });
      if (amount > currentUser.wallet)
        return res.status(400).json({ error: "Insufficient funds" });

      req.session.lastBetAmount = amount;
      req.session.totalProfit = 0;
      await new Promise((r) => req.session.save(r));

      return res.status(200).json({
        message: "Bet Accepted",
        remainingBalance: currentUser.wallet,
      });
    }

    // ---------------------- USER PICK ----------------------
    if (userChoice !== undefined) {
      const choiceNum = Number(userChoice);
      if (![0, 180].includes(choiceNum))
        return res.status(400).json({ error: "Invalid choice" });

      currentUser.playCount = (currentUser.playCount || 0) + 1;
      currentUser.currentUserChoiceBandS = choiceNum;
      // currentUser.wallet -= Number(req.session.lastBetAmount || 0);
      await currentUser.save();

      return res.status(200).json({ message: "Choice saved" });
    }

    // ---------------------- FINAL RESULT ----------------------
    if (timeOut !== undefined) {
      const bet = Number(req.session.lastBetAmount || 0);
      if (!bet || bet <= 0)
        return res.status(400).json({ error: "No active bet" });

      const userPick = Number(currentUser.currentUserChoiceBandS);
      if (![0, 180].includes(userPick)) {
        req.session.lastBetAmount = 0;
        req.session.totalProfit = 0;
        await new Promise((r) => req.session.save(r));
        return res.status(400).json({ error: "Invalid user choice" });
      }

      // ---------------- WIN CHANCE LOGIC ----------------
      let winProbability;
      if (currentUser.playCount <= 3)
        winProbability = 1; // first few plays guaranteed win
      else if (currentUser.wallet <= 20)
        winProbability = 0.1; // low wallet, hard win
      else winProbability = 0.5; // 50% chance normally

      const isWin = Math.random() < winProbability;
      const resultSide = isWin ? userPick : userPick === 0 ? 180 : 0;
      const pickText = userPick === 0 ? "TAIL" : "HEAD";

      if (isWin) {
        // const profit = bet;
        const walletAdd = bet * 0.9;
        const multiplieProfit = walletAdd;
        currentUser.wallet += walletAdd;

        await BetHistory.create({
          userId: currentUser._id,
          gameName: "COIN GAME",
          userPick: pickText,
          amount: bet,
          result: "WIN",
          profit: multiplieProfit,
        });

        await currentUser.save();
        req.session.lastBetAmount = 0;
        req.session.totalProfit = 0;
        await new Promise((r) => req.session.save(r));

        return res.status(200).json({
          rotation: resultSide,
          totalProfit: multiplieProfit,
          remainingBalance: currentUser.wallet,
        });
      } else {
        // LOSS
        currentUser.wallet -= bet; // use bet
        await currentUser.save();

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

        return res.status(200).json({
          rotation: resultSide,
          totalLoss: bet,
          remainingBalance: currentUser.wallet,
        });
      }
    }
  } catch (err) {
    console.error("Coin Error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};
