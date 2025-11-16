document.addEventListener("DOMContentLoaded", () => {
  const numEls = document.querySelectorAll(".num");
  const betPanel = document.querySelector(".bet-container");
  const amountEl = document.querySelector(".bet-container .amount");
  const numberEl = document.querySelector(".bet-container .number");
  const cancelBtn = document.querySelector(".action-buttons .cancel");
  const placeBtn = document.querySelector(".action-buttons .place");
  const userWalletEl = document.getElementById("user-wallet");

  const addBtns = document.querySelectorAll(
    ".bet-buttons [data-value], .circle-buttons [data-value]"
  );

  let baseAmount = 0;
  let totalAmount = baseAmount;
  let selectedNumber = null;

  // === Utility: show bet panel ===
  function showPanel() {
    betPanel.style.display = "block";
    betPanel.setAttribute("aria-hidden", "false");
    betPanel.style.animation = "none";
    requestAnimationFrame(() => (betPanel.style.animation = ""));
  }

  // === Utility: hide bet panel ===
  function hidePanel() {
    betPanel.style.display = "none";
    betPanel.setAttribute("aria-hidden", "true");
    totalAmount = baseAmount;
    amountEl.textContent = totalAmount;
    numberEl.textContent = "-";
    selectedNumber = null;
  }

  // === Disable / Enable All Buttons ===
  function setAllButtonsDisabled(disabled) {
    [...numEls, ...addBtns, cancelBtn, placeBtn].forEach((btn) => {
      btn.disabled = disabled;
      if (disabled) {
        btn.classList.add("opacity-50", "cursor-not-allowed");
      } else {
        btn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    });
  }

  // === Number click logic ===
  numEls.forEach((el) => {
    el.addEventListener("click", () => {
      selectedNumber = el.dataset.num;
      numberEl.textContent = selectedNumber;
      totalAmount = baseAmount;
      amountEl.textContent = totalAmount;
      showPanel();
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  });

  // === Add button logic ===
  addBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = parseInt(btn.dataset.value, 10) || 0;
      totalAmount = Number(totalAmount) + v;
      amountEl.textContent = totalAmount;
    });
  });

  // === Cancel ===
  cancelBtn.addEventListener("click", hidePanel);

  // === Loader overlay control ===
  function showLoaderOverlay() {
    const box = document.getElementById("betMessageBox");
    const inner = document.getElementById("betBoxInner");
    box.classList.remove("hidden");
    box.classList.add("flex");
    inner.classList.remove("opacity-0");
    inner.classList.add("animate-fadeIn");
  }

  function hideLoaderOverlay() {
    const box = document.getElementById("betMessageBox");
    const inner = document.getElementById("betBoxInner");
    inner.classList.remove("animate-fadeIn");
    box.classList.add("hidden");
    box.classList.remove("flex");
  }

  // === Show message with 2-sec loader ===
  function showMessageWith2sLoader(message, success) {
    const box = document.getElementById("betMessageBox");
    const loader = document.getElementById("betLoader");
    const result = document.getElementById("betResultMsg");
    const text = document.getElementById("betResultText");
    const closeBtn = document.getElementById("closeBetMsg");

    // Disable all buttons while showing loader
    setAllButtonsDisabled(true);

    // Show overlay and loader
    showLoaderOverlay();
    loader.classList.remove("hidden");
    result.classList.add("hidden");

    // After 2 seconds, show message
    setTimeout(() => {
      loader.classList.add("hidden");
      result.classList.remove("hidden");

      text.innerHTML = message;
      text.className = success
        ? "text-green-600 font-semibold text-center"
        : "text-red-600 font-semibold text-center";

      closeBtn.onclick = () => {
        hideLoaderOverlay();
        setAllButtonsDisabled(false); // re-enable buttons on close
      };
    }, 2000);
  }

  // === Place Bet ===
  placeBtn.addEventListener("click", async () => {
    if (selectedNumber === null) {
      showMessageWith2sLoader("Please select a number first.", false);
      return;
    }

    let currentWallet = parseFloat(
      userWalletEl.textContent.replace(/[^\d.-]/g, "")
    );
    if (totalAmount > currentWallet) {
      showMessageWith2sLoader("Insufficient wallet balance.", false);
      return;
    }

    // Disable all buttons during API call
    setAllButtonsDisabled(true);

    // Deduct wallet instantly
    const newWallet = currentWallet - totalAmount;
    userWalletEl.textContent = `₹ ${newWallet.toFixed(2)}`;

    const now = new Date();
   const ist = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
   const istTime = new Date(ist).toISOString();

    const data = { number: selectedNumber, amount: totalAmount, ts: istTime };

    try {
      const response = await fetch("/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setTimeout(() => {
          showMessageWith2sLoader(
            `✅ Bet placed successfully!<br>Number: <b>${data.number}</b><br>Amount: ₹${data.amount}`,
            true
          );
          hidePanel();
        }, 2000);
      } else {
        setTimeout(() => {
          showMessageWith2sLoader(`❌ ${result.message}`, false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      setTimeout(() => {
        showMessageWith2sLoader("An error occurred while placing your bet.", false);
      }, 2000);
    }
  });

  hidePanel();
});
