const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../model/user");

// const MatkaResult = require("../model/MatkaResult");;

// exports.getFirstPage = async (req, res, next) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const tomorrow = new Date(today);
//     tomorrow.setDate(today.getDate() + 1);

//     const yesterday = new Date(today);
//     yesterday.setDate(today.getDate() - 1);

//     // Today
//     const todayResults = await MatkaResult.find({
//       declaredAt: { $gte: today, $lt: tomorrow },
//     }).sort({ declaredAt: 1 });

//     // Yesterday
//     const yesterdayResults = await MatkaResult.find({
//       declaredAt: { $gte: yesterday, $lt: today },
//     }).sort({ declaredAt: 1 });

//     // Older than yesterday
//     const historyResults = await MatkaResult.find({
//       declaredAt: { $lt: yesterday },
//     }).sort({ declaredAt: -1 }); // newest first

//     res.render("index", {
//       pageTitle: "Home",
//       isLoggedIn: false,
//       todayResults,
//       yesterdayResults,
//       historyResults,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Server Error");
//   }
// };


exports.getregisterPage = (req, res, next) => {
  res.render("register", {
    pageTitle: "Register",
    isLoggedIn: false,
    errors: [],
    oldInput: {
      username: "",
      referCode: "",
      password: "",
    },
  });
};

exports.postRegisterPage = [
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
      return res.status(400).render("register", {
        isLoggedIn: false,
        errors: errors.array().map((e) => e.msg),
        oldInput: { username, password, referCode },
      });
    }

    try {
      // 1️⃣ Check valid referrer (ONLY admin, master, agent)
      const referrer = await User.findOne({
        referCode: referCode,
        role: { $in: ["admin", "master", "agent"] },
      });

      if (!referrer) {
        return res.status(400).render("register", {
          errors: ["Invalid referral code"],
          oldInput: { username, password, referCode },
        });
      }

      // 2️⃣ Check username again for safety
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).render("register", {
          errors: ["Username already in use"],
          oldInput: { username, password, referCode },
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

      // 6️⃣ Create session
      req.session.isLoggedIn = true;
      req.session.user = newUser;

      res.redirect("/");
    } catch (err) {
      console.error("Registration Error:", err);
      res.status(500).send("Server Error");
    }
  },
];

// ✅ Login Validation Rules

/* ============================
   GET LOGIN PAGE
============================ */
exports.getloginPage = (req, res, next) => {
  res.render("login", {
    pageTitle: "Login",
    isLoggedIn: false,
    errors: [],
    oldInput: {
      username: "",
      password: "",
    },
  });
};

/* ============================
   POST LOGIN PAGE
============================ */
exports.postLoginPage = [
  // 🔐 VALIDATIONS
  check("username").trim().notEmpty().withMessage("Username is required"),
  check("password").notEmpty().withMessage("Password is required"),

  async (req, res, next) => {
    const errors = validationResult(req);
    const { username, password } = req.body;

    /* ----------------------------
       1️⃣ FORM VALIDATION ERROR
    ---------------------------- */
    if (!errors.isEmpty()) {
      return res.status(400).render("login", {
        pageTitle: "Login",
        isLoggedIn: false,
        errors: errors.array().map((e) => e.msg),
        oldInput: { username, password },
      });
    }

    try {
      /* ----------------------------
         2️⃣ FIND USER
      ---------------------------- */
      const user = await User.findOne({ username });

      // ❌ USER NOT FOUND
      if (!user) {
        return res.status(400).render("login", {
          pageTitle: "Login",
          isLoggedIn: false,
          errors: ["Invalid username or password"],
          oldInput: { username, password },
        });
      }

      /* ----------------------------
         3️⃣ USER STATUS CHECK
      ---------------------------- */
      if (user.userStatus && user.userStatus === "suspended") {
        return res.status(200).render("login", {
          pageTitle: "Login",
          isLoggedIn: false,
          errors: [], // intentionally blank
          oldInput: { username: "", password: "" },
        });
      }

      /* ----------------------------
         4️⃣ PASSWORD MATCH
      ---------------------------- */
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).render("login", {
          pageTitle: "Login",
          isLoggedIn: false,
          errors: ["Invalid username or password"],
          oldInput: { username, password },
        });
      }

      /* ----------------------------
         5️⃣ SESSION CREATE
      ---------------------------- */
      req.session.isLoggedIn = true;
      req.session.user = {
        _id: user._id,
        username: user.username,
        role: user.role,
      };

      await new Promise((resolve) => req.session.save(resolve));

      /* ----------------------------
         6️⃣ ROLE BASED REDIRECT
      ---------------------------- */
      switch (user.role) {
        case "admin":
          return res.redirect("/adminpaneldashboard");

        case "master":
          return res.redirect("/masterpaneldashboard");

        case "agent":
          return res.redirect("/agentpaneldashboard");

        default:
          // Normal User
          return res.redirect("/");
      }
    } catch (err) {
      console.error("❌ LOGIN ERROR:", err);

      return res.status(500).render("login", {
        pageTitle: "Login",
        isLoggedIn: false,
        errors: ["Internal server error. Please try again."],
        oldInput: { username: "", password: "" },
      });
    }
  },
];

