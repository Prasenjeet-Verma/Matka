const User = require("../model/user");
const MatkaHistory = require("../model/matkaBetHistory");
const CoinBetHistory = require("../model/coinGame");
const MatkaResult = require("../model/MatkaResult"); // import at top
const { check, validationResult } = require("express-validator");
const bcrypt = require('bcrypt');        // to verify admin password

exports.getAdminPanelDashboard = async (req, res, next) => {
  try {
    // 1️⃣ Check admin login session
    if (!req.isLoggedIn || !req.session.user) {
      return res.redirect("/login");
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

    // ADMIN sees ALL users bets
    const matkaUnsettled = await MatkaHistory.find({
      status: "unsettled",
    }).populate("userId");

    const matkaSettled = await MatkaHistory.find({
      status: "settled",
    }).populate("userId");

    const coinBets = await CoinBetHistory.find().populate("userId");

    // merge matka settled + coin bets
    const allSettledBets = [...matkaSettled, ...coinBets].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.render("adminBet", {
      username: user.username,
      wallet: user.wallet,
      referCode: user.referCode,
      user,
      isLoggedIn: req.session.isLoggedIn,

      // keep original variables
      matkaUnsettled,
      matkaSettled,
      coinBets,

      // merged for EJS
      allSettledBets,
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
        const matka = bet.matkaNo;
        const num = bet.number;

        if (!single[matka]) {
          single[matka] = {};
        }

        if (!single[matka][num]) {
          single[matka][num] = { totalAmount: 0, usersCount: 0 };
        }

        single[matka][num].totalAmount += bet.amount;
        single[matka][num].usersCount += 1;
      }
    });

    bets.forEach((bet) => {
      if (bet.gameName === "Patti") {
        const matka = bet.matkaNo; // group by matka
        const under = bet.underNo;
        const num = bet.number;

        // Create group for matkaNo
        if (!patti[matka]) {
          patti[matka] = {
            underNumbers: {},
          };
        }

        // Create under group inside matka
        if (!patti[matka].underNumbers[under]) {
          patti[matka].underNumbers[under] = {};
        }

        // Create number group inside under
        if (!patti[matka].underNumbers[under][num]) {
          patti[matka].underNumbers[under][num] = {
            totalAmount: 0,
            usersCount: 0,
          };
        }

        // Add amount & count
        patti[matka].underNumbers[under][num].totalAmount += bet.amount;
        patti[matka].underNumbers[under][num].usersCount += 1;
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

// ---------------- Single Result ----------------

exports.postDeclareSingleResult = async (req, res) => {
  try {
    // ... your existing checks
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

    const { matkaNo, singleResult } = req.body;

    if (!matkaNo || !singleResult) {
      return res.status(400).send("MatkaNo or result missing");
    }

    // Save the declared result to MatkaResult
    await MatkaResult.create({
      matkaNo,
      gameName: "Single",
      winningNumber: singleResult.toString(),
    });

    // Process unsettled bets
    const bets = await MatkaHistory.find({
      matkaNo,
      gameName: "Single",
      status: "unsettled",
    });

    for (let bet of bets) {
      if (bet.number.toString() === singleResult.toString()) {
        bet.result = "WIN";
        bet.profit = bet.amount * 9;
        await User.findByIdAndUpdate(bet.userId, {
          $inc: { wallet: bet.profit },
        });
      } else {
        bet.result = "LOSS";
        bet.profit = -bet.amount;
      }

      bet.status = "settled";
      await bet.save();
    }

    res.redirect("/declareMatka");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

// ---------------- Patti Result ----------------
exports.postDeclarePattiResult = async (req, res) => {
  try {
    // ... your existing checks
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

    const { matkaNo, pattiResult } = req.body;

    if (!matkaNo || !pattiResult) {
      return res.status(400).send("MatkaNo or result missing");
    }

    // Save the declared result to MatkaResult
    await MatkaResult.create({
      matkaNo,
      gameName: "Patti",
      winningNumber: pattiResult.toString(),
    });

    // Process unsettled bets
    const bets = await MatkaHistory.find({
      matkaNo,
      gameName: "Patti",
      status: "unsettled",
    });

    for (let bet of bets) {
      if (bet.number.toString() === pattiResult.toString()) {
        bet.result = "WIN";
        bet.profit = bet.amount * 12;
        await User.findByIdAndUpdate(bet.userId, {
          $inc: { wallet: bet.profit },
        });
      } else {
        bet.result = "LOSS";
        bet.profit = -bet.amount;
      }

      bet.status = "settled";
      await bet.save();
    }

    res.redirect("/declareMatka");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

exports.getUserDownLine = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    const loggedUser = await User.findById(req.session.user._id);

    if (!loggedUser || loggedUser.role !== "admin") {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    // 🟢 fetch all users except admin
    const allUsers = await User.find({ role: "user" }).sort({ createdAt: -1 });

    res.render("userdownline", {
      username: loggedUser.username,
      wallet: loggedUser.wallet,
      referCode: loggedUser.referCode,
      user: loggedUser,
      users: allUsers,  // send all users
      errors: [],
      isLoggedIn: req.session.isLoggedIn,
      oldInput: {
        username: "",
        password: "",
      },
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

exports.postAdmincreateuser = [
  check("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long")
    .custom(async (value) => {
      const existingUser = await User.findOne({ username: value });
      if (existingUser) throw new Error("Username already in use");
      return true;
    }),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  check("confirmPassword")
    .notEmpty()
    .withMessage("Confirm Password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password)
        throw new Error("Passwords do not match");
      return true;
    }),

  check("referCode").trim().notEmpty().withMessage("Referral code is required"),


  // MAIN CONTROLLER
  async (req, res) => {
    const errors = validationResult(req);
    const { username, password, referCode } = req.body;

if (!errors.isEmpty()) {
  const allUsers = await User.find({ role: "user" }).sort({ createdAt: -1 });

  return res.status(400).render("userdownline", {
    username: req.session.user.username,
    wallet: req.session.user.wallet,
    referCode: req.session.user.referCode,
    user: req.session.user,
    users: allUsers,
    isLoggedIn: req.session.isLoggedIn,
    errors: errors.array().map((e) => e.msg),
    oldInput: { username, password },
    openModal: true
  });
}



    try {
      // 1️⃣ Check valid referrer (ONLY admin, master, agent)
      const referrer = await User.findOne({
        referCode: referCode,
        role: { $in: ["admin", "master", "agent"] },
      });

if (!referrer) {
  const allUsers = await User.find({ role: "user" }).sort({ createdAt: -1 });

  return res.status(400).render("userdownline", {
    username: req.session.user.username,
    wallet: req.session.user.wallet,
    referCode: req.session.user.referCode,
    user: req.session.user,
    users: allUsers,
    isLoggedIn: req.session.isLoggedIn,
    errors: errors.array().map((e) => e.msg),
    oldInput: { username, password },
    openModal: true
  });
}


      // 2️⃣ Check username again for safety
const existingUser = await User.findOne({ username });
if (existingUser) {
  const allUsers = await User.find({ role: "user" }).sort({ createdAt: -1 });

  return res.status(400).render("userdownline", {
    username: req.session.user.username,
    wallet: req.session.user.wallet,
    referCode: req.session.user.referCode,
    user: req.session.user,
    users: allUsers,
    isLoggedIn: req.session.isLoggedIn,
    errors: errors.array().map((e) => e.msg),
    oldInput: { username, password },
    openModal: true
  });
}


      // 3️⃣ Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4️⃣ GENERATE UNIQUE REFER CODE FOR NEW USER
      const newUserReferCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      // 5️⃣ CREATE NEW USER (role ALWAYS user)
      const newUser = new User({
        username,
        password: hashedPassword,
        referCode: newUserReferCode, // auto generated
        referredBy: referCode, // who referred new user
        role: "user", // ALWAYS user
      });

      await newUser.save();

      res.redirect("/userDownLine");
    } catch (err) {
      console.error("Registration Error:", err);
      res.status(500).send("Server Error");
    }
  },
];


exports.postTransaction = async (req, res, next) => {
  try {
    const { userId, wallet, creditRef, deposit, withdraw, adminPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect('/userDownLine');
    }

    const admin = await User.findById(req.session.user._id);
    if (!admin || admin.role !== 'admin') {
      return res.redirect('/userDownLine');
    }

    // Only check admin password if deposit or withdraw
    if ((deposit || withdraw) && (!adminPassword || !(await bcrypt.compare(adminPassword, admin.password)))) {
      return res.redirect('/userDownLine');
    }

   // Credit Referral (overwrite old value)
if (creditRef) {
  const creditAmount = Number(creditRef);
  user.creditRef = creditAmount;  
  user.refPl = (user.wallet || 0) - user.creditRef;
}


    // Deposit
    if (deposit) {
      user.wallet += Number(deposit);
      if (user.creditRef) user.refPl = user.wallet - user.creditRef;
    }

    // Withdraw
    if (withdraw) {
      const withdrawAmount = Number(withdraw);
      if (withdrawAmount > user.wallet) {
        return res.redirect('/userDownLine');
      }
      user.wallet -= withdrawAmount;
      if (user.creditRef) user.refPl = user.wallet - user.creditRef;
    }

    await user.save();

    // 🚀 Direct Redirect (no render, no flash)
    return res.redirect('/userDownLine');

  } catch (err) {
    console.log(err);
    return res.redirect('/userDownLine');
  }
};
