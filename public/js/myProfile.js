
  const profileBtn = document.getElementById('myProfileBtn');
  const profileDiv = document.getElementById('profileDiv');

  // Toggle div visibility on click
  profileBtn.addEventListener('click', () => {
    profileDiv.classList.toggle('active');
  });

    myProfileBtn.addEventListener("click", () => {
    myProfileBtn.classList.toggle("active");
  });


// ===========================================================================


  const accountCard = document.getElementById("accountCard");
  const modalOverlay = document.getElementById("modalOverlay");
  const editBtn = document.getElementById("editBtn");
  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");

  // Show modal, hide account card
  editBtn.addEventListener("click", (e) => {
    e.preventDefault();
    accountCard.style.display = "none";
    modalOverlay.style.display = "flex";
  });

  // Hide modal, show account card
  closeModal.addEventListener("click", () => {
    modalOverlay.style.display = "none";
    accountCard.style.display = "block";
  });

  cancelModal.addEventListener("click", () => {
    modalOverlay.style.display = "none";
    accountCard.style.display = "block";
  });

  // Toggle password visibility
  function togglePassword(id, el) {
    const input = document.getElementById(id);
    if (input.type === "password") {
      input.type = "text";
      el.textContent = "🙈";
    } else {
      input.type = "password";
      el.textContent = "👁️";
    }
  }
