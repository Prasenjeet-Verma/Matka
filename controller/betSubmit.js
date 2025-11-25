const MatkaBetHistory = require("../model/matkaBetHistory");
const User = require("../model/user");
const moment = require("moment-timezone");

const pattiMap = {
  "1": ["100","678","777","560","470","380","290","119","137","236","146","669","579","399","588","489","245","155","227","344","335","128"],
  "2": ["200","345","444","570","480","390","660","129","237","336","246","679","255","147","228","499","688","778","138","156","110","589"],
  "3": ["300","120","111","580","490","670","238","139","337","157","346","689","355","247","256","166","599","148","788","445","229","779"],
  "4": ["400","789","888","590","130","680","248","149","347","158","446","699","455","266","112","356","239","338","257","220","770","167"],
  "5": ["500","456","555","140","230","690","258","159","357","799","267","780","447","366","113","122","177","249","339","889","348","168"],
  "6": ["600","123","222","150","330","240","268","169","367","448","899","178","790","466","358","880","114","556","259","349","457","277"],
  "7": ["700","890","999","160","340","250","278","179","377","467","115","124","223","566","557","368","359","449","269","133","188","458"],
  "8": ["800","567","666","170","350","260","288","189","116","233","459","125","224","477","990","134","558","369","378","440","279","468"],
  "9": ["900","234","333","180","360","270","450","199","117","469","126","667","478","135","225","144","379","559","289","388","577","568"],
  "0": ["000","127","190","280","370","460","550","235", "118", "578","145","479","668","299","334","488","389","226","569","277","136","244"]
};

function detectUnderNumber(patti) {
  for (const under in pattiMap) {
    if (pattiMap[under].includes(patti)) return under;
  }
  return null;
}

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

    const ist = moment(ts).tz("Asia/Kolkata");
    const betTime = ist.format("h:mm:ss A");
    const betDate = ist.format("DD,MM,YYYY");

    // Game detection
    const singleNumbers = ["0","1","2","3","4","5","6","7","8","9"];
    const gameName = singleNumbers.includes(number.toString())
      ? "Single"
      : "Patti";

    // Wallet Deduct
    user.wallet -= amount;
    await user.save();

    let underNo = null;
    let finalNumber = number; // default (for single)

    // If Patti Game
    if (gameName === "Patti") {
      underNo = detectUnderNumber(number);

      if (!underNo)
        return res.json({ success: false, message: "Invalid Patti Number" });

      finalNumber = number;  // <-- THIS IS WHAT YOU WANT
    }

    // Save
    await MatkaBetHistory.create({
      userId,
      number: finalNumber,   
      underNo,               
      amount,
      time: betTime,
      date: betDate,
      matkaNo,
      status: "unsettled",
      gameName,
    });

    res.json({
      success: true,
      message: "Bet placed",
      time: betTime,
      date: betDate,
      matkaNo,
      gameName,
      underNo,
      finalNumber
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

  if (hour === 9 && minute <= 50) return "Matka#1";
  if (hour === 10 && minute <= 50) return "Matka#2";
  if (hour === 11 && minute <= 50) return "Matka#3";
  if (hour === 12 && minute <= 50) return "Matka#4";
  if (hour === 13 && minute <= 50) return "Matka#5";
  if (hour === 14 && minute <= 50) return "Matka#6";
  if (hour === 15 && minute <= 50) return "Matka#7";
  if (hour === 16 && minute <= 50) return "Matka#8";
  if (hour === 17 && minute <= 50) return "Matka#9";
  if (hour === 18 && minute <= 50) return "Matka#10";
  if (hour === 19 && minute <= 50) return "Matka#11";
  if (hour === 20 && minute <= 50) return "Matka#12";

  return null;
}


// exports.placeBet = async (req, res) => {
//   try {
//     const { number, amount, ts } = req.body;

//     const userId = req.session.user._id;
//     const user = await User.findById(userId);

//     if (!user) return res.json({ success: false, message: "User not found" });

//     if (user.wallet < amount)
//       return res.json({ success: false, message: "Insufficient wallet" });

//     const matkaNo = getMatkaNo(ts);
//     if (!matkaNo)
//       return res.json({ success: false, message: "Invalid Matka slot" });

//     // Convert UTC → IST
//     const ist = moment(ts).tz("Asia/Kolkata");
//     const betTime = ist.format("h:mm:ss A");
//     const betDate = ist.format("DD,MM,YYYY");

//     // ====================== GAME NAME DETECTION ======================
//     const singleNumbers = ["0","1","2","3","4","5","6","7","8","9"];
//     const gameName = singleNumbers.includes(number.toString())
//       ? "Single"
//       : "Patti";
//     // ================================================================

//     // Deduct wallet
//     user.wallet -= amount;
//     await user.save();

//     // Save separate Matka history
//     await MatkaBetHistory.create({
//       userId,
//       number,
//       amount,
//       time: betTime,
//       date: betDate,
//       matkaNo,
//       status: "unsettled",
//       gameName,   // <---- YOUR GAME NAME SET HERE
//     });

//     res.json({
//       success: true,
//       message: "Bet placed",
//       time: betTime,
//       date: betDate,
//       matkaNo,
//       gameName
//     });

//   } catch (err) {
//     console.log("Place Bet Error:", err);
//     res.json({ success: false, message: "Server Error" });
//   }
// };



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
