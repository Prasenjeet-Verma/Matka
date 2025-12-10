document.addEventListener("DOMContentLoaded", () => {

  const profileBtn = document.getElementById("myProfileBtn");
  const profileDiv = document.getElementById("profileDiv");

  // Toggle Profile Section
  profileBtn.addEventListener("click", () => {
    profileDiv.classList.toggle("active");
  });

  // Elements for modal
  const accountCard = document.getElementById("accountCard");
  const modalOverlay = document.getElementById("modalOverlay");
  const editBtn = document.getElementById("editBtn");
  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");

  // OPEN MODAL
  editBtn.addEventListener("click", (e) => {
    e.preventDefault();
    accountCard.style.display = "none";
    modalOverlay.style.display = "flex";
  });

  // CLOSE MODAL (X)
  closeModal.addEventListener("click", () => {
    modalOverlay.style.display = "none";
    accountCard.style.display = "block";
  });

  // CLOSE MODAL (NO)
  cancelModal.addEventListener("click", () => {
    modalOverlay.style.display = "none";
    accountCard.style.display = "block";
  });
});
