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
  document.getElementById("user-wallet").textContent = `₹ ${parseFloat(
    amount
  ).toFixed(2)}`;
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

function disableChips() {
  amountChipsButtons.forEach((chip) => {
    chip.disabled = true;
  });
}

function enableChips() {
  amountChipsButtons.forEach((chip) => {
    chip.disabled = false;
  });
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
    disableChips();
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

              rotation = data.rotation;
              coin.style.transform = `rotateY(${rotation}deg)`;

              // ------------------ WAIT FOR COIN TO STOP ------------------
              setTimeout(() => {
                // WIN
                if (data.totalProfit !== undefined) {
                  updateWallet(data.remainingBalance);
                  showMessage(
                    `You Won! 🎉 +${data.totalProfit}`,
                    "bg-green-600"
                  );

                  setTimeout(() => {
                    showMessage("Game Resetting...", "bg-black");
                   return resetUI();
                  }, 1500);
                  
                }

                // LOSS
                if (data.totalLoss !== undefined) {
                  showMessage(`You Lost! ❌ -${data.totalLoss}`, "bg-red-600");
                  updateWallet(data.remainingBalance);
                  
                 setTimeout(() => {
                    showMessage("Game Resetting...", "bg-black");
                   return resetUI();
                  }, 1500);

                }

      
              }, 800); // <-- coin stop delay
            });
        }, 3000); // <-- spin duration
      });
  });
});

// ------------------ RESET UI ------------------
function resetUI() {
  // 2️⃣ Remove Selected Chip Highlight
  if (selectedChip) {
    selectedChip.classList.remove("selected");
    selectedChip = null;
  }

  // 4️⃣ Reset Coin Rotation Smoothly
  rotation = 0;
  coin.style.transition = "transform 0.5s ease-out";
  coin.style.transform = "rotateY(0deg)";
  setTimeout(() => (coin.style.transition = ""), 600);

  // 5️⃣ Clear last server bet (optional safer)
  //fetch(`${BASE_URL}/coinreset`, { method: "POST" }).catch(() => {});

  // 6️⃣ Enable Chips Again (you want user to choose new bet again)
  enableChips();
  // 7️⃣ Disable Head/Tail (they only enable after bet)
  disablePick();
};

// ------------------ SHOW MESSAGE FUNCTION ------------------
/**
 * Displays a stylish, animated notification message.
 * Requires Tailwind CSS to be linked for the utility classes.
 * * @param {string} text The message content to display.
 * @param {string} [bgColor="bg-gray-800"] The background color class (e.g., "bg-green-500", "bg-red-600").
 */
function showMessage(text, bgColor = "bg-gray-800") {
  let container = document.getElementById("messageContainer");

  // --- 1. Audio and Setup (Unchanged but cleaned) ---
  const audio = new Audio("https://freesound.org/data/previews/331/331912_3248244-lq.mp3"); // Example beep
  audio.volume = 0.3;
  audio.play().catch(() => {}); // Catch error if autoplay blocked

  // Prevent new message if the same one is already displayed
  if (container && container.textContent === text) return;

  if (!container) {
    // --- 2. Create and Style New Container (Enhanced Styling) ---
    container = document.createElement("div");
    container.id = "messageContainer";

    // Dynamic keyframe classes for animation
    const styleSheet = document.styleSheets[0] || document.head.appendChild(document.createElement('style')).sheet;
    
    // Add slide-in keyframe
    try {
      if (styleSheet.cssRules.length === 0 || !Array.from(styleSheet.cssRules).some(rule => rule.name === 'slideIn')) {
        styleSheet.insertRule(`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translate(-50%, -100%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `, styleSheet.cssRules.length);
      }
    } catch(e) {/* Ignore keyframe insert error if forbidden */}


    // Classes for central positioning, high z-index, padding, text, shadows, and the new animation
    container.className = `
      fixed top-50% left-1/2 
      transform -translate-x-1/2
      z-[1000] px-6 py-3 rounded-xl text-white 
      text-base font-semibold shadow-2xl transition-all
      duration-500 ease-in-out
      backdrop-blur-sm bg-opacity-90 border-t-4 border-white/50
      ${bgColor} 
      animate-[slideIn_0.5s_forwards]
    `;

    // Add a slight 3D/Pop effect (using Tailwind's shadow and hover utilities for appearance)
    container.style.boxShadow = `
      0 10px 30px rgba(0, 0, 0, 0.5), 
      0 0 15px rgba(255, 255, 255, 0.3) inset
    `;
    
    // Add a subtle pulse/lift effect to show it's active
    container.style.animationName = "slideIn, pulse";
    container.style.animationDuration = "0.5s, 1.5s";
    container.style.animationTimingFunction = "forwards, ease-in-out";
    container.style.animationIterationCount = "1, infinite";
    container.style.animationDirection = "normal, alternate";
    
    // Adding the 'pulse' keyframe if it doesn't exist
    try {
      if (!Array.from(styleSheet.cssRules).some(rule => rule.name === 'pulse')) {
        styleSheet.insertRule(`
          @keyframes pulse {
            from {
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 255, 255, 0.3) inset;
            }
            to {
              box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(255, 255, 255, 0.4) inset;
            }
          }
        `, styleSheet.cssRules.length);
      }
    } catch(e) {/* Ignore keyframe insert error if forbidden */}


    container.textContent = text;
    document.body.appendChild(container);

  } else {
    // --- 3. Update Existing Container ---
    // If a container already exists, update its text and reset the animation
    container.textContent = text;
    // Remove all animation/transition classes to ensure a fresh display
    container.classList.remove('opacity-0', 'animate-slideOut'); 
    container.style.animationName = "slideIn, pulse";
  }

  // --- 4. Timeout and Removal (Enhanced Animation) ---
  setTimeout(() => {
    // Add a stylish slide-out animation class
    container.style.animationName = "slideOut";
    container.style.animationDuration = "0.5s";
    container.style.animationTimingFunction = "forwards";
    container.style.animationIterationCount = "1";

    // Adding the 'slideOut' keyframe if it doesn't exist
    try {
      const styleSheet = document.styleSheets[0];
      if (styleSheet && !Array.from(styleSheet.cssRules).some(rule => rule.name === 'slideOut')) {
        styleSheet.insertRule(`
          @keyframes slideOut {
            from {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            to {
              opacity: 0;
              transform: translate(-50%, -100%) scale(0.9);
            }
          }
        `, styleSheet.cssRules.length);
      }
    } catch(e) {/* Ignore keyframe insert error if forbidden */}

    // Remove element after the slide-out animation is complete
    setTimeout(() => {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 500); // Matches the slideOut animation duration

  }, 3500); // Display time before starting the slide-out
}

// Example of how to call it:
// showMessage("Success! Your action was completed.", "bg-green-600"); 
// showMessage("Warning: Data might be outdated.", "bg-yellow-600");
// showMessage("Error: Please check your connection.", "bg-red-700");




// function showMessage(text, bgColor = "bg-black") {
//   let container = document.getElementById("messageContainer");

//   // Add notification sound
//   const audio = new Audio("https://freesound.org/data/previews/331/331912_3248244-lq.mp3"); // Example beep
//   audio.volume = 0.3;
//   audio.play().catch(() => {}); // catch error if autoplay blocked

//   if (!container) {
//     container = document.createElement("div");
//     container.id = "messageContainer";

//     container.className = `
//       fixed top-1/2 left-1/2 
//       transform -translate-x-1/2 -translate-y-1/2
//       z-50 px-8 py-5 rounded-3xl text-white 
//       text-lg font-bold shadow-2xl
//       ${bgColor} transition-all duration-300
//       animate-fadeIn opacity-100
//       backdrop-blur-md bg-opacity-80 border border-white/20
//     `;

//     // Add subtle glow
//     container.style.boxShadow = "0 8px 20px rgba(0,0,0,0.6), 0 0 10px rgba(255,255,255,0.2)";

//     container.textContent = text;
//     document.body.appendChild(container);
//   } else {
//     if (container.textContent === text) return;
//     container.textContent = text;
//     container.classList.remove("opacity-0");
//   }

//   setTimeout(() => {
//     container.classList.add("opacity-0");

//     setTimeout(() => {
//       if (container?.parentNode) {
//         container.parentNode.removeChild(container);
//       }
//     }, 300);
//   }, 3500);
// }






// function showMessage(text, bgColor = "bg-black") {
//   let container = document.getElementById("messageContainer");

//   if (!container) {
//     container = document.createElement("div");
//     container.id = "messageContainer";

//     container.className = `
//       fixed top-1/2 left-1/2 
//       transform -translate-x-1/2 -translate-y-1/2
//       z-50 px-6 py-4 rounded-2xl text-white 
//       text-lg font-semibold shadow-xl
//       ${bgColor} transition-all duration-300
//       animate-fadeIn opacity-100
//     `;

//     container.textContent = text;
//     document.body.appendChild(container);
//   } else {
//     if (container.textContent === text) return;
//     container.textContent = text;
//     container.classList.remove("opacity-0");
//   }

//   setTimeout(() => {
//     container.classList.add("opacity-0");

//     setTimeout(() => {
//       if (container?.parentNode) {
//         container.parentNode.removeChild(container);
//       }
//     }, 300);
//   }, 3500);
// };
