const BASE_URL = window.location.origin;
const amountChipsButtons = document.querySelectorAll(".chip-button");
const btnTail = document.getElementById("Tails");
const btnHead = document.getElementById("Heads");
const userTotalBalance = document.getElementById("user-wallet");
const coin = document.getElementById("coin");
let selectedChip = null; // chip animation
let rotation = 0;

// ------------------ UPDATE WALLET DISPLAY ------------------
function updateWallet(amount) {
  document.getElementById("user-wallet").textContent = `₹ ${parseFloat(amount).toFixed(2)}`;
}

// ------------------ PICK DISABLE / ENABLE ------------------
function disablePick() {
  btnHead.disabled = true;
  btnTail.disabled = true;
}
disablePick();

function enablePick() {
  btnHead.disabled = false;
  btnTail.disabled = false;
}

// ------------------ CHIP BUTTON LOGIC (STUCK SELECT) ------------------
amountChipsButtons.forEach((chip) => {
  chip.addEventListener("click", () => {
    const amountValue = parseInt(chip.getAttribute("data-value"));

    // remove old selection
    if (selectedChip) selectedChip.classList.remove("selected");

    // add new selection
    chip.classList.add("selected");
    selectedChip = chip;

    console.log(`Bet Chip selected: ${amountValue}`);

    // validate
    if (
      isNaN(amountValue) ||
      amountValue <= 0 ||
      amountValue >
        parseFloat(userTotalBalance.textContent.replace(/[^\d.-]/g, ""))
    ) {
      showMessage("Enter valid amount", "bg-red-600");
      return;
    }

    // send amount to backend
    fetch(`${BASE_URL}/coin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixBetAmount: amountValue }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          showMessage(data.error, "bg-red-600");
          return resetUI();
        }

        if (data.remainingBalance !== undefined) {
        updateWallet(data.remainingBalance);
          enablePick();
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
});

// ------------------ USER HEAD / TAIL PICK ------------------
[btnHead, btnTail].forEach((button) => {
  button.addEventListener("click", () => {
    disablePick();
    const userChoice = parseInt(button.getAttribute("degree"), 10);
    if (isNaN(userChoice)) {
      showMessage("Invalid choice", "bg-red-600");
      return;
    }

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

       // button.disabled = true;

        // ------------------ COIN SPIN ------------------
        let spinInterval = setInterval(() => {
          rotation += 360;
          coin.style.transform = `rotateY(${rotation}deg)`;
        }, 300);

        // ------------------ FINAL RESULT AFTER SPIN ------------------
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
                setTimeout(() => {
                  showMessage(data.error, "bg-red-600");
                  resetUI();
                }, 600);
                return;
              }

              // Set final rotation on coin
              rotation = data.rotation || 0;
              coin.style.transform = `rotateY(${rotation}deg)`;

              // ------------------ WAIT FOR COIN TO STOP ------------------
              setTimeout(() => {
                // WIN
                if (data.totalProfit !== undefined) {
                  updateWallet(data.remainingBalance);
                  showMessage(`You Won! 🎉 +${data.totalProfit}`, "bg-green-600");
                  return resetUI();
                }

                // LOSS
                if (data.totalLoss !== undefined) {
                 updateWallet(data.remainingBalance);
                  showMessage(`You Lost! ❌ -${data.totalLoss}`, "bg-red-600");
                  return resetUI();
                }

                resetUI();
              }, 800); // <-- coin stop delay
            });
        }, 3000); // <-- spin duration
      });
  });
});

// ------------------ RESET UI ------------------
function resetUI() {

  // 1️⃣ Disable Pick Buttons
  disablePick();

  // 2️⃣ Remove Selected Chip Highlight
  if (selectedChip) {
    selectedChip.classList.remove("selected");
    selectedChip = null;
  }

  // 3️⃣ Reset Result Text
  const resultText = document.getElementById("resultText");
  if (resultText) {
    resultText.textContent = "Flip";
    resultText.className = "mt-4 text-xl font-semibold text-black h-6 text-center";
  }

  // 4️⃣ Reset Coin Rotation Smoothly
  rotation = 0;
  coin.style.transition = "transform 0.5s ease-out";
  coin.style.transform = "rotateY(0deg)";
  setTimeout(() => (coin.style.transition = ""), 600);

  // 5️⃣ Clear last server bet (optional safer)
  //fetch(`${BASE_URL}/coinreset`, { method: "POST" }).catch(() => {});

  // 6️⃣ Enable Chips Again (you want user to choose new bet again)
  amountChipsButtons.forEach(chip => {
    chip.disabled = false;
  });

  // 7️⃣ Disable Head/Tail (they only enable after bet)
  btnHead.disabled = true;
  btnTail.disabled = true;
};

function showMessage(text, bgColor = "bg-black") {
  let container = document.getElementById("messageContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "messageContainer";

    container.className = `
      fixed top-1/2 left-1/2 
      transform -translate-x-1/2 -translate-y-1/2
      z-50 px-6 py-4 rounded-2xl text-white 
      text-lg font-semibold shadow-xl
      ${bgColor} transition-all duration-300
      animate-fadeIn opacity-100
    `;

    container.textContent = text;
    document.body.appendChild(container);
  } else {
    if (container.textContent === text) return;
    container.textContent = text;
    container.classList.remove("opacity-0");
  }

  setTimeout(() => {
    container.classList.add("opacity-0");

    setTimeout(() => {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 300);

  }, 3500);
};
