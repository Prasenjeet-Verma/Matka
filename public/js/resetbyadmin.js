document.addEventListener("DOMContentLoaded", () => {

  const resetForm = document.getElementById("resetForm");
  if (!resetForm) return; // prevent error

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msgBox = document.getElementById("msgBox");
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());

    if (body.newPassword !== body.confirmNewPassword) {
      msgBox.style.display = "block";
      msgBox.style.background = "#ffdddd";
      msgBox.innerText = "New password & confirm password do not match!";
      return;
    }

    try {
      const res = await fetch("/resetpasswordnotcheckoldpassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      msgBox.style.display = "block";
      msgBox.style.background = data.success ? "#ddffdd" : "#ffdddd";
      msgBox.innerText = data.message;

      if (data.success) {
        setTimeout(() => {
          document.getElementById("modalOverlay").style.display = "none";
          window.location.reload();
        }, 1000);
      }

    } catch (err) {
      console.log(err);
      msgBox.style.display = "block";
      msgBox.innerText = "Server error. Please try again.";
    }
  });

});
