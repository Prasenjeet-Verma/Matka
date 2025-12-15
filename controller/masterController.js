const User = require("../model/user");
const MatkaHistory = require("../model/matkaBetHistory");
const CoinBetHistory = require("../model/coinGame");
const MatkaResult = require("../model/MatkaResult"); // import at top
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt"); // to verify admin password



exports.getMasterPanelDashboard = async (req , res,next) => {
    try {
        // 1️⃣ Check admin login session
        if (!req.isLoggedIn || !req.session.user) {
          return res.redirect("/login");
        }
        const user = await User.findById(req.session.user._id);
    
        if (!user || user.role !== "master") {
          req.session.destroy(() => {
            res.redirect("/login");
          });
          return;
        }
    
        const visibleUsers = await User.find({
          role: { $in: ["admin", "master", "agent", "user"] },
        });
    
        if (user.role === "master") {
          // 2️⃣ Render admin dashboard EJS with user data
          res.render("masterFolder/masterpaneldashboard", {
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
        console.error("❌ Master Dashboard Error:", err);
        res.status(500).send("Server Error");
      }
}

// exports.getUserDownLineByMaster = async (req, res, next) => {
//   try {
//     // ✅ Check login
//     if (!req.session.isLoggedIn || !req.session.user) {
//       return req.session.destroy(() => res.redirect("/login"));
//     }

//     const loggedUser = await User.findById(req.session.user._id);

//     // ✅ Only master allowed
//     if (!loggedUser || loggedUser.role !== "master") {
//       return req.session.destroy(() => res.redirect("/login"));
//     }

//     // 🟢 Same status filter logic (ADMIN JAISE)
//     const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
//     const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
//     const statusValue = statusMap[statusFilter] || "active";

//     // 🟡 DIFFERENCE: sirf master ke created / referred users
//     const allUsers = await User.find({
//       role: "user",
//       userStatus: statusValue,
//       referredBy: loggedUser.referCode, // ⭐ MAIN DIFFERENCE
//     }).sort({ createdAt: -1 });

//     // 🟢 SAME EJS RENDER (reuse userdownline.ejs)
//     res.render("masterFolder/userdownlineofmaster", {
//       username: loggedUser.username,
//       wallet: loggedUser.wallet,
//       referCode: loggedUser.referCode,
//       user: loggedUser,
//       users: allUsers,
//       errors: [],
//       isLoggedIn: req.session.isLoggedIn,
//       oldInput: { username: "", password: "" },
//       selectedStatus: statusFilter,
//     });
//   } catch (err) {
//     console.error("❌ Master Downline Error:", err);
//     res.status(500).send("Server Error");
//   }
// };


// exports.postMasterCreateUser = [
//   // ================= VALIDATION =================
//   check("username")
//     .trim()
//     .notEmpty()
//     .withMessage("Username is required")
//     .isLength({ min: 3 })
//     .withMessage("Username must be at least 3 characters")
//     .custom(async (value) => {
//       if (await User.findOne({ username: value })) {
//         throw new Error("Username already in use");
//       }
//       return true;
//     }),

//   check("password")
//     .notEmpty()
//     .withMessage("Password is required")
//     .isLength({ min: 6 })
//     .withMessage("Password must be at least 6 characters"),

//   check("confirmPassword")
//     .notEmpty()
//     .withMessage("Confirm Password is required")
//     .custom((value, { req }) => {
//       if (value !== req.body.password) {
//         throw new Error("Passwords do not match");
//       }
//       return true;
//     }),

//   check("referCode").trim().notEmpty().withMessage("Referral code is required"),

//   // ================= CONTROLLER =================
//   async (req, res) => {
//     // 🟢 Map frontend dropdown to DB values
//     const statusMap = { ACTIVE: "active", INACTIVE: "suspended" };
//     const statusFilter = (req.query.status || "ACTIVE").toUpperCase();
//     const statusValue = statusMap[statusFilter] || "active"; // fallback to active
//     /* 🔐 SESSION CHECK */
//     if (!req.session.isLoggedIn || !req.session.user) {
//       return req.session.destroy(() => res.redirect("/login"));
//     }

//     const loggedUser = await User.findById(req.session.user._id);
//     if (
//       !loggedUser ||
//       !["admin", "master", "agent"].includes(loggedUser.role)
//     ) {
//       return req.session.destroy(() => res.redirect("/login"));
//     }

//     const errors = validationResult(req);
//     const { username, password, referCode } = req.body;

//     const renderError = async (msgs) => {
//       const allUsers = await User.find({
//         role: "user",
//         userStatus: statusValue,
//       }).sort({
//         createdAt: -1,
//       });
//       return res.status(400).render("masterFolder/userdownlineofmaster", {
//         username: loggedUser.username,
//         wallet: loggedUser.wallet,
//         referCode: loggedUser.referCode,
//         user: loggedUser,
//         users: allUsers,
//         isLoggedIn: true,
//         errors: msgs,
//         oldInput: { username },
//         openModal: true,
//         selectedStatus: statusFilter,
//         referredBy: loggedUser.referCode, // ⭐ MAIN DIFFERENCE
//       });
//     };

//     if (!errors.isEmpty()) {
//       return renderError(errors.array().map((e) => e.msg));
//     }

//     try {
//       /* 🔐 REFER CODE OWNERSHIP CHECK */
//       const referrer = await User.findOne({
//         referCode,
//         role: { $in: ["admin", "master", "agent"] },
//       });

//       if (!referrer) {
//         return renderError(["Invalid referral code"]);
//       }

//       // 🚫 Prevent using someone else's referCode
//       if (
//         loggedUser.role !== "admin" &&
//         referrer._id.toString() !== loggedUser._id.toString()
//       ) {
//         return renderError(["You cannot use another user's referral code"]);
//       }

//       /* 🔐 PASSWORD HASH */
//       const hashedPassword = await bcrypt.hash(password, 10);

//       /* 🔐 UNIQUE REFER CODE */
//       let newUserReferCode;
//       do {
//         newUserReferCode = Math.random()
//           .toString(36)
//           .substring(2, 10)
//           .toUpperCase();
//       } while (await User.findOne({ referCode: newUserReferCode }));

//       /* ✅ CREATE USER */
//       const newUser = new User({
//         username,
//         password: hashedPassword,
//         referCode: newUserReferCode,
//         referredBy: referCode,
//         role: "user",
//       });

//       await newUser.save();

//       return res.redirect("/userdownLinebymasterdashboard");
//     } catch (err) {
//       console.error("Create User Error:", err);
//       return res.status(500).send("Server Error");
//     }
//   },
// ];