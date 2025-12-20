function filterStatus(value) {
  const url = new URL(window.location.href);
  url.searchParams.set("status", value);
  window.location.href = url.toString();
}


/* ============================================================
   MULTI TABLE SEARCH + PAGINATION
============================================================ */
document.querySelectorAll("[data-table]").forEach(wrapper => {
  const rows = [...wrapper.querySelectorAll("tbody tr")];
  const searchInput = wrapper.querySelector(".table-search");
  const prevBtn = wrapper.querySelector(".prev");
  const nextBtn = wrapper.querySelector(".next");
  const pageBtn = wrapper.querySelector(".page");

  const rowsPerPage = 10;
  let currentPage = 1;

  const renderPage = (page = 1) => {
    const text = searchInput.value.toLowerCase();

    const filtered = rows.filter(row =>
      row.children[1].innerText.toLowerCase().includes(text)
    );

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    currentPage = Math.min(page, totalPages);

    rows.forEach(r => r.style.display = "none");

    filtered
      .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
      .forEach(r => r.style.display = "");

    pageBtn.innerText = currentPage;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  };

  prevBtn.onclick = () => renderPage(currentPage - 1);
  nextBtn.onclick = () => renderPage(currentPage + 1);
  searchInput.oninput = () => renderPage(1);

  renderPage();
});

/* ============================================================
   STATUS MODAL (GLOBAL – ALL TABLES)
============================================================ */
let currentStatus = null;
const modalWrapper = document.getElementById("statusModalWrapper");
const modal = document.getElementById("statusModal");
const btnActive = document.getElementById("btn-active");
const btnSuspended = document.getElementById("btn-suspended");
const submitBtn = document.getElementById("submitStatusBtn");
const closeBtn = document.getElementById("closeStatusModal");
const msgBox = document.getElementById("statusMessageBox");

document.querySelectorAll(".settingsBtn").forEach(btn => {
  btn.onclick = () => {
    modalWrapper.dataset.userid = btn.dataset.userid;

    const row = btn.closest("tr");
    selectStatus(row.querySelector(".status").innerText);

    modalWrapper.classList.remove("hidden");
  };
});

const selectStatus = status => {
  currentStatus = status;
  btnActive.disabled = status === "Active";
  btnSuspended.disabled = status === "Suspended";
};

btnActive.onclick = () => selectStatus("Active");
btnSuspended.onclick = () => selectStatus("Suspended");

closeBtn.onclick = () => modalWrapper.classList.add("hidden");

submitBtn.onclick = async () => {
  const userId = modalWrapper.dataset.userid;
  if (!userId || !currentStatus) return;

  const res = await fetch("/postTransaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      userStatus: currentStatus.toLowerCase()
    })
  });

  const data = await res.json();
  msgBox.innerText = data.message;
  msgBox.classList.remove("hidden");

  if (data.success) setTimeout(() => location.reload(), 1000);
};
