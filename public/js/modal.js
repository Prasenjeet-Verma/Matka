document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
      1) PASSWORD TOGGLE (COMMON)
  ============================================================ */
  function togglePasswordVisibility(iconElement) {
    const targetId = iconElement.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);

    if (!passwordInput) return;

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      iconElement.classList.remove('fa-eye');
      iconElement.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      iconElement.classList.remove('fa-eye-slash');
      iconElement.classList.add('fa-eye');
    }
  }

  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => togglePasswordVisibility(button));
  });



  /* ============================================================
      2) ADD USER MODAL
  ============================================================ */
  const openBtn = document.getElementById('openModalBtn');
  const userModal = document.getElementById('userModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const createBtn = document.getElementById('createBtn');

  if (openBtn && userModal && closeBtn && createBtn) {

    function openUserModal() {
      userModal.classList.add('open');
      userModal.setAttribute('aria-hidden', 'false');

      const firstInput = userModal.querySelector('input');
      if (firstInput) firstInput.focus();
    }

    function closeUserModal() {
      userModal.classList.remove('open');
      userModal.setAttribute('aria-hidden', 'true');
      openBtn.focus();
    }

    openBtn.addEventListener('click', openUserModal);
    closeBtn.addEventListener('click', closeUserModal);

    userModal.addEventListener('click', (e) => {
      if (e.target === userModal) closeUserModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && userModal.classList.contains('open')) {
        closeUserModal();
      }
    });

createBtn.addEventListener('click', (e) => {
  e.preventDefault(); // stop default behavior temporarily

  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const confirm = document.getElementById('confirm-password').value;

  if (!user) return alert('Please enter username');
  if (!pass) return alert('Please enter password');
  if (pass !== confirm) return alert('Passwords do not match');

  document.getElementById("registerForm").submit();  // now submit safely
});

  }



  /* ============================================================
      3) DEPOSIT MODAL
  ============================================================ */
  const depositButtons = document.querySelectorAll('.deposit-btn');
  const depositModal = document.getElementById('depositModal');
  const closeDepositBtn = document.getElementById('closeDeposit');
  const depositPwdInput = document.getElementById('deposit-credential');
  const depositPwdToggle = document.querySelector('.pwd-toggle-btn');

  if (depositModal && closeDepositBtn) {

    depositButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        depositModal.classList.add('active');
      });
    });

    closeDepositBtn.addEventListener('click', () => {
      depositModal.classList.remove('active');
    });

    depositModal.addEventListener('click', (e) => {
      if (e.target === depositModal) depositModal.classList.remove('active');
    });

    if (depositPwdToggle && depositPwdInput) {
      depositPwdToggle.addEventListener('click', () => {
        if (depositPwdInput.type === 'password') {
          depositPwdInput.type = 'text';
          depositPwdToggle.textContent = '🙈';
        } else {
          depositPwdInput.type = 'password';
          depositPwdToggle.textContent = '👁️';
        }
      });
    }
  }



  /* ============================================================
      4) WITHDRAW MODAL
  ============================================================ */
  const withdrawButtons = document.querySelectorAll(".withdraw-btn");
  const withdrawModal = document.getElementById("withdrawModal");
  const closeWithdrawBtn = document.getElementById("closeWithdraw");
  const withdrawPwdInput = document.getElementById("withdraw-credential");
  const withdrawEyeIcon = document.querySelector(".withdraw-input-group .pwd-toggle-btn");

  if (withdrawModal && closeWithdrawBtn) {

    withdrawButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        withdrawModal.classList.add("active");
        withdrawModal.style.display = "flex";
      });
    });

    closeWithdrawBtn.addEventListener("click", () => {
      withdrawModal.classList.remove("active");
      withdrawModal.style.display = "none";
    });

    withdrawModal.addEventListener("click", (e) => {
      if (e.target === withdrawModal) {
        withdrawModal.classList.remove("active");
        withdrawModal.style.display = "none";
      }
    });

    if (withdrawEyeIcon && withdrawPwdInput) {
      withdrawEyeIcon.addEventListener("click", () => {
        if (withdrawPwdInput.type === "password") {
          withdrawPwdInput.type = "text";
          withdrawEyeIcon.classList.remove("fa-eye");
          withdrawEyeIcon.classList.add("fa-eye-slash");
        } else {
          withdrawPwdInput.type = "password";
          withdrawEyeIcon.classList.remove("fa-eye-slash");
          withdrawEyeIcon.classList.add("fa-eye");
        }
      });
    }
  }



  /* ============================================================
      5) CREDIT REFERRAL MODAL
  ============================================================ */
  const wrapper = document.getElementById('creditReferralFormWrapper');
  const creditModal = document.getElementById('creditReferralForm');
  const editButtons = document.querySelectorAll('.editBtn');
  const creditCloseBtn = document.getElementById('closeBtn');
  const messageBox = document.getElementById('messageBox');
  const referralInput = document.getElementById('referralNumber');

  if (wrapper && creditModal && creditCloseBtn) {

    function openCreditModal() {
      wrapper.style.display = 'flex';

      creditModal.classList.remove('anim-exit');
      void creditModal.offsetWidth;
      creditModal.classList.add('anim-enter');

      document.body.style.overflow = 'hidden';
      messageBox.textContent = '';
      referralInput.value = '';
    }

    function closeCreditModal() {
      creditModal.classList.remove('anim-enter');
      void creditModal.offsetWidth;
      creditModal.classList.add('anim-exit');

      creditModal.addEventListener('animationend', function end() {
        wrapper.style.display = 'none';
        creditModal.classList.remove('anim-exit');
        document.body.style.overflow = '';
        creditModal.removeEventListener('animationend', end);
      });
    }

    editButtons.forEach(btn => {
      btn.addEventListener('click', openCreditModal);
    });

    creditCloseBtn.addEventListener('click', closeCreditModal);

    wrapper.addEventListener('click', e => {
      if (e.target === wrapper) closeCreditModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeCreditModal();
    });
  }

});




// <!---------------------------------------------------------- Status Modal ---------------------------------------------->


let currentStatus = null;

function selectStatus(status) {
    currentStatus = status;
    const btnActive = document.getElementById('btn-active');
    const btnSuspended = document.getElementById('btn-suspended');
    const messageBox = document.getElementById('messageBox');

    btnActive.classList.remove('selected');
    btnSuspended.classList.remove('selected');

    if (status === 'Active') btnActive.classList.add('selected');
    if (status === 'Suspended') btnSuspended.classList.add('selected');

    messageBox.classList.add('hidden');
}

function handleSubmit() {
    const messageBox = document.getElementById('messageBox');

    if (currentStatus) {
        messageBox.textContent = `Status submitted: ${currentStatus}`;
        messageBox.className = "mt-6 text-center text-lg font-bold text-green-600";
    } else {
        messageBox.textContent = "Please select a status first.";
        messageBox.className = "mt-6 text-center text-lg font-bold text-red-600";
    }

    messageBox.classList.remove('hidden');
}

// MODAL OPEN/CLOSE
document.addEventListener("DOMContentLoaded", () => {
    const modalWrapper = document.getElementById("statusModalWrapper");
    const modal = document.getElementById("statusModal");
    const settingsButtons = document.querySelectorAll(".settingsBtn");
    const closeBtn = document.getElementById("closeStatusModal");

    settingsButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            modalWrapper.classList.remove("hidden");
            modal.classList.remove("opacity-0", "scale-90");
            modal.classList.add("opacity-100", "scale-100");
        });
    });

    closeBtn.addEventListener("click", () => closeModal());

    modalWrapper.addEventListener("click", (e) => {
        if (e.target === modalWrapper) closeModal();
    });

    function closeModal() {
        modal.classList.add("opacity-0", "scale-90");
        modal.classList.remove("opacity-100", "scale-100");

        setTimeout(() => {
            modalWrapper.classList.add("hidden");
        }, 250);
    }
});

window.onload = () => selectStatus('Active');
