// // ✅ Function to get current IST time correctly
// function getCurrentIST() {
//   const now = new Date();
//   // Convert UTC → IST (+5:30)
//   const utc = now.getTime() + now.getTimezoneOffset() * 60000;
//   const istTime = new Date(utc + 5.5 * 60 * 60 * 1000);
//   return istTime;
// }

// // ✅ Function to check if current time is within range
// function isWithinTimeRange(startHour, startMinute, endHour, endMinute) {
//   const now = getCurrentIST();

//   const start = new Date(now);
//   start.setHours(startHour, startMinute, 0, 0);

//   const end = new Date(now);
//   end.setHours(endHour, endMinute, 0, 0);

//   return now >= start && now <= end;
// }

// // ✅ Update all cards based on current time
// function updateMatkaCards() {
//   const matka1Active = isWithinTimeRange(9, 0, 9, 50);
//   const matka2Active = isWithinTimeRange(10, 0, 10, 50);
//   const matka3Active = isWithinTimeRange(11, 0, 11, 50);
//   const matka4Active = isWithinTimeRange(12, 0, 12, 50);
//   const matka5Active = isWithinTimeRange(13, 0, 13, 50);
//   const matka6Active = isWithinTimeRange(14, 0, 14, 50);
//   const matka7Active = isWithinTimeRange(15, 0, 15, 50);
//   const matka8Active = isWithinTimeRange(16, 0, 16, 50);
//   const matka9Active = isWithinTimeRange(17, 0, 17, 50);
//   const matka10Active = isWithinTimeRange(18, 0, 18, 50);
//   const matka11Active = isWithinTimeRange(19, 0, 19, 50);
//   const matka12Active = isWithinTimeRange(20, 0, 20, 50);

//   toggleCard(document.querySelectorAll('.NineToNineFifthy'), matka1Active);
//   toggleCard(document.querySelectorAll('.TenToTenFifthy'), matka2Active);
//   toggleCard(document.querySelectorAll('.ElevenToElevenFifthy'), matka3Active);
//   toggleCard(document.querySelectorAll('.TwelveToTwelveFifthy'), matka4Active);
//   toggleCard(document.querySelectorAll('.OneToOneFifthy'), matka5Active);
//   toggleCard(document.querySelectorAll('.TwoToTwoFifthy'), matka6Active);
//   toggleCard(document.querySelectorAll('.ThreeToThreeFifthy'), matka7Active);
//   toggleCard(document.querySelectorAll('.FourToFourFifthy'), matka8Active);
//   toggleCard(document.querySelectorAll('.FiveToFiveFifthy'), matka9Active);
//   toggleCard(document.querySelectorAll('.SixToSixFifthy'), matka10Active);
//   toggleCard(document.querySelectorAll('.SevenToSevenFifthy'), matka11Active);
//   toggleCard(document.querySelectorAll('.EightToEightFifthy'), matka12Active);
// }

// // ✅ Enable / disable cards
// function toggleCard(cards, isActive) {
//   cards.forEach(card => {
//     const buttons = card.querySelectorAll("button");
//     buttons.forEach(btn => {
//       btn.disabled = !isActive;
//       btn.style.opacity = isActive ? "1" : "0.5";
//       btn.style.cursor = isActive ? "pointer" : "not-allowed";
//     });
//   });
// }

// // ✅ Initial + auto refresh every 30 sec
// updateMatkaCards();
// setInterval(updateMatkaCards, 30000);

// // ✅ Countdown Timer Logic
// document.addEventListener("DOMContentLoaded", () => {
//   const timers = document.querySelectorAll(".timer");

//   timers.forEach(timerEl => {
//     const targetTime = timerEl.dataset.target; // example "19:50:00"
//     const [targetHour, targetMin, targetSec] = targetTime.split(":").map(Number);

//     function updateTimer() {
//       const now = new Date();
//       const target = new Date();

//       // target time set kar rahe
//       target.setHours(targetHour, targetMin, targetSec, 0);

//       // agar target next day ka hai (midnight ke baad)
//       if (target < now) {
//         target.setDate(target.getDate() + 1);
//       }

//       const diff = target - now;

//       const hours = Math.floor(diff / (1000 * 60 * 60));
//       const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
//       const secs = Math.floor((diff % (1000 * 60)) / 1000);

//       timerEl.textContent = `${hours.toString().padStart(2, "0")}:${mins
//         .toString()
//         .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

//       if (diff <= 0) {
//         timerEl.textContent = "00:00:00";
//         clearInterval(timerEl.intervalId);
//       }
//     }

//     updateTimer(); // immediately run once
//     timerEl.intervalId = setInterval(updateTimer, 1000); // har timer ka apna interval
//   });
// });




// ================== Matka Sessions ==================
const matkaSessions = [
  { className: "NineToNineFifthy", start: "09:00", end: "09:50" },
  { className: "TenToTenFifthy", start: "10:00", end: "10:50" },
  { className: "ElevenToElevenFifthy", start: "11:00", end: "11:50" },
  { className: "TwelveToTwelveFifthy", start: "12:00", end: "12:50" },
  { className: "OneToOneFifthy", start: "13:00", end: "13:50" },
  { className: "TwoToTwoFifthy", start: "14:00", end: "14:50" },
  { className: "ThreeToThreeFifthy", start: "15:00", end: "15:50" },
  { className: "FourToFourFifthy", start: "16:00", end: "16:50" },
  { className: "FiveToFiveFifthy", start: "17:00", end: "17:50" },
  { className: "SixToSixFifthy", start: "18:00", end: "18:50" },
  { className: "SevenToSevenFifthy", start: "19:00", end: "19:50" },
  { className: "EightToEightFifthy", start: "20:00", end: "20:50" }
];

function getCurrentIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}

function getISTDate(hourMin) {
  const [h, m] = hourMin.split(":").map(Number);
  const now = getCurrentIST();
  const date = new Date(now);
  date.setHours(h, m, 0, 0);
  return date;
}

function updateMatka() {
  const now = getCurrentIST();

  // ⭐ 1. Check if ALL sessions are finished (AFTER last card ends)
  const lastSession = matkaSessions[matkaSessions.length - 1];
  const lastEnd = getISTDate(lastSession.end);

  if (now > lastEnd) {
    // ⭐ All sessions complete → show all cards again + reset countdown UI
    document.querySelectorAll(".matka-card").forEach(card => {
      card.style.display = "block";
      const timerEl = card.querySelector(".timer");
      if (timerEl) timerEl.textContent = "00:00:00";
    });
  }

  matkaSessions.forEach(session => {
    const cardEls = document.querySelectorAll(`.${session.className}`);
    const startTime = getISTDate(session.start);
    const endTime = getISTDate(session.end);

    let isActive = now >= startTime && now <= endTime;

    cardEls.forEach(card => {

      // ⭐ 2. SESSION END → Hide card
      if (now > endTime) {
        card.style.display = "none";
      } else {
        card.style.display = "block";
      }

      // Buttons disable/enable
      card.querySelectorAll("button").forEach(btn => {
        btn.disabled = isActive;
        btn.style.opacity = isActive ? "0.5" : "1";
        btn.style.cursor = isActive ? "not-allowed" : "pointer";
      });

      const timerEl = card.querySelector(".timer");
      if (!timerEl) return;

      if (isActive) {
        timerEl.textContent = "";
        return;
      }

      let diff;
      if (now < startTime) {
        diff = startTime - now;
      } else {
        diff = startTime.getTime() + 24 * 60 * 60 * 1000 - now;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      timerEl.textContent =
        `${hours.toString().padStart(2, "0")}:` +
        `${mins.toString().padStart(2, "0")}:` +
        `${secs.toString().padStart(2, "0")}`;
    });
  });
}

updateMatka();
setInterval(updateMatka, 1000);
