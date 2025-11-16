// public/js/coin.js
const BASE_URL = window.location.origin;
const coin = document.getElementById("coin");
const betAmount = document.getElementById("betinput");
const betForm = document.getElementById("form");
const btnTail = document.getElementById("Tails");
const btnHead = document.getElementById("Heads");
const resultText = document.getElementById("resultText");
const userTotalBalance = document.getElementById("user-wallet");
const placeBetBtn = document.getElementById("placeBetBtn");
const cashBtn = document.getElementById("cashbtn");
let currentProfit = document.getElementById("currentprofit");
let rotation = 0;
let PORT = 3000;

disablePick(); // initially disable head/tails

function disablePick() {
  btnHead.disabled = true;
  btnTail.disabled = true;
}

function enablePick() {
  btnHead.disabled = false;
  btnTail.disabled = false;
}

function resetUI() {
  rotation = 0;
  betAmount.value = "";
  placeBetBtn.disabled = false;
  cashBtn.disabled = true;
  cashBtn.textContent = "Cash Out";
  currentProfit.textContent = `Total Profit: ₹0`;
  resultText.textContent = "Flip";
  disablePick();
}

function showMessage(text, bgColor = "bg-black") {
  let container = document.getElementById("messageContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "messageContainer";
    container.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50
        px-6 py-3 rounded-xl text-white text-base font-semibold shadow-lg
        ${bgColor} transition-all duration-300`;
    container.textContent = text;
    document.body.appendChild(container);
  } else {
    container.textContent = text;
  }

  setTimeout(() => {
    if (container && container.parentNode) container.parentNode.removeChild(container);
  }, 1500);
}

// ------------- Place Bet (form submit) -------------
betForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const userTotalMoney = parseFloat(userTotalBalance.textContent);
  const fixBetAmount = parseFloat(betAmount.value);

  if (isNaN(fixBetAmount) || fixBetAmount <= 0) {
    showMessage("Enter valid amount", "bg-red-600");
    return;
  }

  if (fixBetAmount > userTotalMoney) {
    showMessage("You don't have enough money.", "bg-red-600");
    return;
  }

  // Send only fixBetAmount
  fetch(`${BASE_URL}/coin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fixBetAmount }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        showMessage(data.error, "bg-red-600");
        return resetUI();
      }

      if (data.remainingBalance !== undefined) {
        userTotalBalance.textContent = parseFloat(data.remainingBalance).toFixed(2);

        // ⭐⭐⭐ Bet Lagte Hi Message ⭐⭐⭐
        showMessage("Bet Placed Successfully!", "bg-green-600");

        // Lock place bet, enable pick and cash out
        placeBetBtn.disabled = true;
        enablePick();
        cashBtn.disabled = false;
        resultText.textContent = "Pick a side";
      } else {
        showMessage("Unexpected response from server", "bg-red-600");
        resetUI();
      }
    })
    .catch((err) => {
      console.error("Place Bet error:", err);
      showMessage("Server error", "bg-red-600");
      resetUI();
    });
});

// ------------- Pick Head/Tails -------------
[btnHead, btnTail].forEach((button) => {
  button.addEventListener("click", () => {
    const userChoice = parseInt(button.getAttribute("degree"), 10);
    if (isNaN(userChoice)) {
      showMessage("Invalid choice", "bg-red-600");
      return;
    }
    resultText.textContent = "Flipping...";
    
    fetch(`${BASE_URL}/coin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userChoice }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          showMessage(data.error, "bg-red-600");
          resetUI();
          return;
        }

        button.disabled = true;
        let spinInterval = setInterval(() => {
          rotation += 360;
          coin.style.transform = `rotateY(${rotation}deg)`;
        }, 200);

        setTimeout(() => {
          clearInterval(spinInterval);
          fetch(`${BASE_URL}/coin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timeOut: true }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.error) {
                showMessage(data.error, "bg-red-600");
                resetUI();
                return;
              }

              if (data.rotation !== undefined) {
                rotation = data.rotation;
                coin.style.transform = `rotateY(${rotation}deg)`;
                resultText.textContent = "Flip";

                if (data.totalProfit !== undefined) {
                  currentProfit.textContent = `Total Profit: ₹${data.totalProfit}`;
                  cashBtn.disabled = false;
                } else {
                  setTimeout(() => {
                    resetUI();
                  }, 900);
                }
              } else {
                showMessage("No rotation received", "bg-red-600");
                resetUI();
              }

              if (placeBetBtn.disabled) {
                btnHead.disabled = false;
                btnTail.disabled = false;
              } else {
                disablePick();
              }
            })
            .catch((err) => {
              console.error("Timeout fetch error:", err);
              showMessage("Server error", "bg-red-600");
              resetUI();
            });
        }, 2000);
      })
      .catch((err) => {
        console.error("UserChoice request failed:", err);
        showMessage("Server error", "bg-red-600");
        resetUI();
      });
  });
});

// ------------- Cash Out -------------
cashBtn.addEventListener("click", () => {
  if (cashBtn.disabled) return;

  fetch(`${BASE_URL}/coin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cashOut: true }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.addTotalProfit !== undefined) {
        showMessage("Cash Out successful!", "bg-green-600");
        userTotalBalance.textContent = parseFloat(data.addTotalProfit).toFixed(2);
        resetUI();
      } else if (data.error) {
        showMessage(data.error, "bg-red-600");
      } else {
        showMessage("Cash Out failed", "bg-red-600");
      }
    })
    .catch((err) => {
      console.error("Cashout error:", err);
      showMessage("Cashout error", "bg-red-600");
    });
});
