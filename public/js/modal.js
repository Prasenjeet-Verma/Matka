document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
      1) PASSWORD TOGGLE (UNIVERSAL)
  ============================================================ */
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
      const targetId = icon.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });

  /* ============================================================
      2) ADD USER MODAL
  ============================================================ */
  const openBtn = document.getElementById('openModalBtn');
  const userModal = document.getElementById('userModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const createBtn = document.getElementById('createBtn');
  const registerForm = document.getElementById("registerForm");

  if (openBtn && userModal && closeBtn && createBtn) {
    const openUserModal = () => {
      userModal.classList.add('open');
      userModal.setAttribute('aria-hidden', 'false');
      userModal.style.display = "flex";
      const firstInput = userModal.querySelector('input');
      if (firstInput) firstInput.focus();
    };
    const closeUserModal = () => {
      userModal.classList.remove('open');
      userModal.setAttribute('aria-hidden', 'true');
      userModal.style.display = "none";
      openBtn.focus();
    };

    openBtn.addEventListener('click', openUserModal);
    closeBtn.addEventListener('click', closeUserModal);
    userModal.addEventListener('click', (e) => { if (e.target === userModal) closeUserModal(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && userModal.classList.contains('open')) closeUserModal(); });

    createBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const user = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value;
      const confirm = document.getElementById('confirm-password').value;
      if (!user) return alert('Please enter username');
      if (!pass) return alert('Please enter password');
      if (pass !== confirm) return alert('Passwords do not match');
      registerForm.submit();
    });

    // Password match message
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirm-password");
    const matchMsg = document.getElementById("matchMsg");

    confirmPassword.addEventListener("input", () => {
      if (confirmPassword.value === "") matchMsg.textContent = "";
      else if (password.value === confirmPassword.value) {
        matchMsg.textContent = "✅ Passwords match";
        matchMsg.style.color = "green";
      } else {
        matchMsg.textContent = "❌ Passwords do not match";
        matchMsg.style.color = "red";
      }
    });
  }

  /* ============================================================
      3) DEPOSIT MODAL
  ============================================================ */
  const depositButtons = document.querySelectorAll('.deposit-btn');
  const depositModal = document.getElementById('depositModal');
  const closeDepositBtn = document.getElementById('closeDeposit');
  const depositAmountInput = document.getElementById('deposit-amount-input');
  const depositPwdInput = document.getElementById('deposit-credential');
  const depositUserIdInput = document.getElementById('depositUserId');
  const depositWalletInput = document.getElementById('depositWallet');

  if (depositModal) {
    const closeDeposit = () => {
      depositModal.classList.remove('active');
      depositModal.style.display = "none";
    };
    depositButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        depositModal.classList.add('active');
        depositModal.style.display = 'flex';
        depositAmountInput.value = '';
        depositPwdInput.value = '';
        depositUserIdInput.value = btn.dataset.userid;
        depositWalletInput.value = btn.dataset.wallet;
        depositAmountInput.focus();
      });
    });
    closeDepositBtn.addEventListener('click', closeDeposit);
    depositModal.addEventListener('click', e => { if (e.target === depositModal) closeDeposit(); });
  }

  /* ============================================================
      4) WITHDRAW MODAL
  ============================================================ */
  const withdrawButtons = document.querySelectorAll(".withdraw-btn");
  const withdrawModal = document.getElementById("withdrawModal");
  const closeWithdrawBtn = document.getElementById("closeWithdraw");
  const withdrawAmountInput = document.getElementById('withdraw-amount-input');
  const withdrawPwdInput = document.getElementById("withdraw-credential");
  const withdrawUserIdInput = document.getElementById('withdrawUserId');
  const withdrawWalletInput = document.getElementById('withdrawWallet');

  if (withdrawModal) {
    const closeWithdraw = () => {
      withdrawModal.classList.remove("active");
      withdrawModal.style.display = "none";
    };
    withdrawButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        withdrawModal.classList.add("active");
        withdrawModal.style.display = "flex";
        withdrawAmountInput.value = '';
        withdrawPwdInput.value = '';
        withdrawUserIdInput.value = btn.dataset.userid;
        withdrawWalletInput.value = btn.dataset.wallet;
        withdrawAmountInput.focus();
      });
    });
    closeWithdrawBtn.addEventListener("click", closeWithdraw);
    withdrawModal.addEventListener("click", e => { if (e.target === withdrawModal) closeWithdraw(); });
  }

  /* ============================================================
      5) CREDIT REFERRAL MODAL
  ============================================================ */
  const wrapper = document.getElementById('creditReferralFormWrapper');
  const creditModal = document.getElementById('creditReferralForm');
  const editButtons = document.querySelectorAll('.editBtn');
  const creditCloseBtn = document.getElementById('closeBtn');
  const referralInput = document.getElementById('referralNumber');
  const creditUserIdInput = document.getElementById('creditUserId');
  const creditWalletInput = document.getElementById('creditWallet');
  const creditMessageBox = document.getElementById('creditMessageBox');

  if (wrapper && creditModal) {
    const closeCredit = () => {
      creditModal.classList.remove('anim-enter');
      void creditModal.offsetWidth;
      creditModal.classList.add('anim-exit');
      creditModal.addEventListener('animationend', function end() {
        wrapper.style.display = 'none';
        creditModal.classList.remove('anim-exit');
        document.body.style.overflow = '';
        creditModal.removeEventListener('animationend', end);
      });
    };

    editButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        wrapper.style.display = 'flex';
        creditModal.classList.remove('anim-exit');
        void creditModal.offsetWidth;
        creditModal.classList.add('anim-enter');
        document.body.style.overflow = 'hidden';
        referralInput.value = '';
        creditMessageBox.textContent = '';
        creditUserIdInput.value = btn.dataset.userid;
        creditWalletInput.value = btn.dataset.wallet;
        referralInput.focus();
      });
    });

    creditCloseBtn.addEventListener('click', closeCredit);
    wrapper.addEventListener('click', e => { if (e.target === wrapper) closeCredit(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCredit(); });
  }

  /* ============================================================
      6) STATUS MODAL
  ============================================================ */
  let currentStatus = null;
  const btnActive = document.getElementById('btn-active');
  const btnSuspended = document.getElementById('btn-suspended');
  const statusMessageBox = document.getElementById('statusMessageBox');
  const modalWrapperStatus = document.getElementById("statusModalWrapper");
  const modalStatus = document.getElementById("statusModal");
  const settingsButtons = document.querySelectorAll(".settingsBtn");
  const closeStatusBtn = document.getElementById("closeStatusModal");
  const submitStatusBtn = document.getElementById("submitStatusBtn");

  const selectStatus = (status) => {
    currentStatus = status;
    btnActive.classList.remove('selected');
    btnSuspended.classList.remove('selected');
    if (status === 'Active') btnActive.classList.add('selected');
    if (status === 'Suspended') btnSuspended.classList.add('selected');
    statusMessageBox.classList.add('hidden');
  };

  const closeStatus = () => {
    modalStatus.classList.add("opacity-0", "scale-90");
    modalStatus.classList.remove("opacity-100", "scale-100");
    setTimeout(() => { modalWrapperStatus.classList.add("hidden"); }, 250);
  };

  settingsButtons.forEach(btn => btn.addEventListener("click", () => {
    modalWrapperStatus.classList.remove("hidden");
    modalStatus.classList.remove("opacity-0", "scale-90");
    modalStatus.classList.add("opacity-100", "scale-100");
  }));

  closeStatusBtn.addEventListener("click", closeStatus);
  modalWrapperStatus.addEventListener("click", e => { if (e.target === modalWrapperStatus) closeStatus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeStatus(); });

  btnActive.addEventListener('click', () => selectStatus('Active'));
  btnSuspended.addEventListener('click', () => selectStatus('Suspended'));
  submitStatusBtn.addEventListener('click', () => {
    if (currentStatus) {
      statusMessageBox.textContent = `Status submitted: ${currentStatus}`;
      statusMessageBox.className = "mt-6 text-center text-lg font-bold text-green-600";
    } else {
      statusMessageBox.textContent = "Please select a status first.";
      statusMessageBox.className = "mt-6 text-center text-lg font-bold text-red-600";
    }
    statusMessageBox.classList.remove('hidden');
  });

  selectStatus('Active'); // default

});
