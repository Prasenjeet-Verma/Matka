const User = require('../model/user');
const moment = require('moment-timezone');

exports.placeBet = async (req, res, next) => {
  try {
    const { number, amount, ts } = req.body;

    if (!number || !amount || !ts) {
      return res.json({ success: false, message: 'Invalid bet data' });
    }

    const userId = req.session.user;
    if (!userId) {
      return res.json({ success: false, message: 'User not logged in' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }

    // Wallet check
    if (user.wallet < amount) {
      return res.json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Matka slot number
    const matkaNo = getMatkaNo(ts);
    if (!matkaNo) {
      return res.json({ success: false, message: 'Invalid time for any Matka slot' });
    }

    // Game Name Detection
    const singleNumbers = ['0','1','2','3','4','5','6','7','8','9'];
    const gameName = singleNumbers.includes(number.toString()) ? "Single patti" : "Patti";

    // Deduct wallet
    user.wallet -= amount;

    // 🔥 Convert UTC → IST
    const ist = moment(ts).tz("Asia/Kolkata");

    // 🔥 Format Time (HH:mm:ss)
   const betTime = ist.format("h:mm:ss A");

    // 🔥 Format Date (DD,MM,YYYY)
    const betDate = ist.format("DD,MM,YYYY");

    // Save bet
    user.bets.push({
      number,
      amount,
      time: betTime,      // only time
      date: betDate,      // only date
      createdAt: new Date(),
      matkaNo,
      gameName,
    });

    await user.save();

    res.json({
      success: true,
      message: `Bet placed successfully for ${matkaNo}`,
      gameName,
      time: betTime,
      date: betDate
    });

  } catch (error) {
    console.error('Error placing bet:', error);
    res.json({ success: false, message: 'Server error' });
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

