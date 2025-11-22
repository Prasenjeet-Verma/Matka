const MatkaBetHistory = require("../model/matkaBetHistory");
const User = require("../model/user");
const moment = require("moment-timezone");

exports.placeBet = async (req, res) => {
  try {
    const { number, amount, ts } = req.body;

    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (!user) return res.json({ success: false, message: "User not found" });

    if (user.wallet < amount)
      return res.json({ success: false, message: "Insufficient wallet" });

    const matkaNo = getMatkaNo(ts);
    if (!matkaNo)
      return res.json({ success: false, message: "Invalid Matka slot" });

    // Convert UTC → IST
    const ist = moment(ts).tz("Asia/Kolkata");
    const betTime = ist.format("h:mm:ss A");
    const betDate = ist.format("DD,MM,YYYY");

    // ====================== GAME NAME DETECTION ======================
    const singleNumbers = ["0","1","2","3","4","5","6","7","8","9"];
    const gameName = singleNumbers.includes(number.toString())
      ? "Single"
      : "Patti";
    // ================================================================

    // Deduct wallet
    user.wallet -= amount;
    await user.save();

    // Save separate Matka history
    await MatkaBetHistory.create({
      userId,
      number,
      amount,
      time: betTime,
      date: betDate,
      matkaNo,
      status: "unsettled",
      gameName,   // <---- YOUR GAME NAME SET HERE
    });

    res.json({
      success: true,
      message: "Bet placed",
      time: betTime,
      date: betDate,
      matkaNo,
      gameName
    });

  } catch (err) {
    console.log("Place Bet Error:", err);
    res.json({ success: false, message: "Server Error" });
  }
};



// ================== GET MATKA SLOT ==================
function getMatkaNo(ts) {
  const date = moment(ts).tz('Asia/Kolkata');
  const hour = date.hour();
  const minute = date.minute();

  if (hour === 9 && minute <= 50) return "matka1";
  if (hour === 10 && minute <= 50) return "matka2";
  if (hour === 11 && minute <= 50) return "matka3";
  if (hour === 12 && minute <= 50) return "matka4";
  if (hour === 13 && minute <= 50) return "matka5";
  if (hour === 14 && minute <= 50) return "matka6";
  if (hour === 15 && minute <= 50) return "matka7";
  if (hour === 16 && minute <= 50) return "matka8";
  if (hour === 17 && minute <= 50) return "matka9";
  if (hour === 18 && minute <= 50) return "matka10";
  if (hour === 19 && minute <= 50) return "matka11";
  if (hour === 20 && minute <= 50) return "matka12";

  return null;
}


//getMatkaNo(ts) run hota hai

// function ke andar ts ka value chala jaata hai.

// function apna kaam karta hai (check karta hai hours, minutes etc.)

// agar return karta hai to wo value wapas bhejta hai.

// const matkaNo = ...

// function ke return ki hui value ko matkaNo me store karta hai.

// exports.declareResult = async (req, res) => {
//   try {
//     const { matkaNo, resultNumber } = req.body;

//     // Find all unsettled bets for this matka slot
//     const unsettledBets = await BetHistory.find({
//       matkaNo,
//       status: "unsettled"
//     });

//     if (!unsettledBets.length) {
//       return res.json({ success: false, message: "No unsettled bets found" });
//     }

//     // Update all to SETTLED
//     await BetHistory.updateMany(
//       { matkaNo, status: "unsettled" },
//       { status: "settled", resultNumber }
//     );

//     res.json({ success: true, message: "Results declared and bets settled" });

//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: "Server error" });
//   }
// };
