document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData.entries());
  const msgBox = document.getElementById("msgBox");

  try {
    const res = await fetch("/resetpassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json(); // backend se JSON response expect karega

    msgBox.style.display = "block";
    msgBox.style.background = data.success ? "#ddffdd" : "#ffdddd";
    msgBox.style.color = data.success ? "#006400" : "#a70000";
    msgBox.innerText = data.message;

    if (data.success) {
      setTimeout(() => {
        window.location.href = "/account";
      }, 1500);
    }
  } catch (err) {
    msgBox.style.display = "block";
    msgBox.innerText = "Server error. Please try again.";
  }
});