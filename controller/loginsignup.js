const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../model/user");

exports.getFirstPage = (req, res, next) => {
  res.render("index", {
    pageTitle: "Home",
    isLoggedIn: false,
  });
};

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

// ✅ Validation Rules
exports.postRegisterPage = [
  check("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long")
    .custom(async (value) => {
      const existingUser = await User.findOne({ username: value });
      if (existingUser) {
        throw new Error("Username already in use");
      }
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
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("referCode").trim().notEmpty().withMessage("Referral code is required"),

  // ✅ Controller Function
  async (req, res, next) => {
    const errors = validationResult(req);
    const { username, password, referCode } = req.body;
    // If validation fails
    if (!errors.isEmpty()) {
      return res.status(400).render("register", {
        isLoggedIn: false,
        errors: errors.array().map((error) => error.msg),
        oldInput: { username, password, referCode },
      });
    }

    try {
      // 1️⃣ Check if username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).render("register", {
          errors: ["Username already in use try another one"],
          oldInput: { username, password, referCode },
        });
      }

      // 2️⃣ Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3️⃣ Save user
      const newUser = new User({
        username,
        password: hashedPassword,
        referCode,
      });

      await newUser.save();

      // 4️⃣ Create session
      req.session.isLoggedIn = true;
      req.session.user = newUser;

      res.redirect("/dashboard"); // redirect after success
    } catch (err) {
      console.error("❌ Registration error:", err);
      res.status(500).send("Server Error");
    }
  },
];

// ✅ Login Validation Rules
exports.postLoginPage = [
  check("username").trim().notEmpty().withMessage("Username is required"),
  check("password").notEmpty().withMessage("Password is required"),

  async (req, res, next) => {
    const errors = validationResult(req);
    const { username, password } = req.body;

    // Validation errors (from express-validator)
    if (!errors.isEmpty()) {
      return res.status(400).render("login", {
        errors: errors.array().map((error) => error.msg),
        oldInput: { username, password },
      });
    }

    try {
      const user = await User.findOne({ username });

      // ❌ User not found
      if (!user) {
        return res.status(400).render("login", {
          errors: ["Invalid username or password"], // ✅ Custom message
          oldInput: { username, password },
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      // ❌ Password mismatch
      if (!isMatch) {
        return res.status(400).render("login", {
          errors: ["Invalid username or password"], // ✅ Custom message
          oldInput: { username, password },
        });
      }

      // ✅ Login success
      req.session.isLoggedIn = true;
      req.session.user = user;
      res.redirect("/dashboard");
    } catch (err) {
      console.error("❌ Login error:", err);
      res.status(500).send("Server Error");
    }
  },
];
