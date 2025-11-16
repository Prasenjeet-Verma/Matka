// ✅ Function to get current IST time correctly
function getCurrentIST() {
  const now = new Date();
  // Convert UTC → IST (+5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + 5.5 * 60 * 60 * 1000);
  return istTime;
}

// ✅ Function to check if current time is within range
function isWithinTimeRange(startHour, startMinute, endHour, endMinute) {
  const now = getCurrentIST();

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);

  return now >= start && now <= end;
}

// ✅ Update all cards based on current time
function updateMatkaCards() {
  const matka1Active = isWithinTimeRange(9, 0, 9, 50);
  const matka2Active = isWithinTimeRange(10, 0, 10, 50);
  const matka3Active = isWithinTimeRange(11, 0, 11, 50);
  const matka4Active = isWithinTimeRange(12, 0, 12, 50);
  const matka5Active = isWithinTimeRange(13, 0, 13, 50);
  const matka6Active = isWithinTimeRange(14, 0, 14, 50);
  const matka7Active = isWithinTimeRange(15, 0, 15, 50);
  const matka8Active = isWithinTimeRange(16, 0, 16, 50);
  const matka9Active = isWithinTimeRange(17, 0, 17, 50);
  const matka10Active = isWithinTimeRange(18, 0, 18, 50);
  const matka11Active = isWithinTimeRange(19, 0, 19, 50);
  const matka12Active = isWithinTimeRange(20, 0, 20, 50);

  toggleCard(document.querySelectorAll('.NineToNineFifthy'), matka1Active);
  toggleCard(document.querySelectorAll('.TenToTenFifthy'), matka2Active);
  toggleCard(document.querySelectorAll('.ElevenToElevenFifthy'), matka3Active);
  toggleCard(document.querySelectorAll('.TwelveToTwelveFifthy'), matka4Active);
  toggleCard(document.querySelectorAll('.OneToOneFifthy'), matka5Active);
  toggleCard(document.querySelectorAll('.TwoToTwoFifthy'), matka6Active);
  toggleCard(document.querySelectorAll('.ThreeToThreeFifthy'), matka7Active);
  toggleCard(document.querySelectorAll('.FourToFourFifthy'), matka8Active);
  toggleCard(document.querySelectorAll('.FiveToFiveFifthy'), matka9Active);
  toggleCard(document.querySelectorAll('.SixToSixFifthy'), matka10Active);
  toggleCard(document.querySelectorAll('.SevenToSevenFifthy'), matka11Active);
  toggleCard(document.querySelectorAll('.EightToEightFifthy'), matka12Active);
}

// ✅ Enable / disable cards
function toggleCard(cards, isActive) {
  cards.forEach(card => {
    const buttons = card.querySelectorAll("button");
    buttons.forEach(btn => {
      btn.disabled = !isActive;
      btn.style.opacity = isActive ? "1" : "0.5";
      btn.style.cursor = isActive ? "pointer" : "not-allowed";
    });
  });
}

// ✅ Initial + auto refresh every 30 sec
updateMatkaCards();
setInterval(updateMatkaCards, 30000);

// ✅ Countdown Timer Logic
document.addEventListener("DOMContentLoaded", () => {
  const timers = document.querySelectorAll(".timer");

  timers.forEach(timerEl => {
    const targetTime = timerEl.dataset.target; // example "19:50:00"
    const [targetHour, targetMin, targetSec] = targetTime.split(":").map(Number);

    function updateTimer() {
      const now = new Date();
      const target = new Date();

      // target time set kar rahe
      target.setHours(targetHour, targetMin, targetSec, 0);

      // agar target next day ka hai (midnight ke baad)
      if (target < now) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target - now;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      timerEl.textContent = `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      if (diff <= 0) {
        timerEl.textContent = "00:00:00";
        clearInterval(timerEl.intervalId);
      }
    }

    updateTimer(); // immediately run once
    timerEl.intervalId = setInterval(updateTimer, 1000); // har timer ka apna interval
  });
});
