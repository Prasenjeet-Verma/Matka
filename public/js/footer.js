document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');

  // Helper to remove active from all
  function clearActive() {
    navItems.forEach(i => i.classList.remove('active'));
  }

  // Click behavior: set active. Note: this doesn't prevent navigation.
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      // If you DON'T want the link to navigate (single-page behaviour), uncomment:
      // e.preventDefault();

      clearActive();
      item.classList.add('active');
    });
  });

  
  // Auto-set active based on current URL path (works after navigation)
  // Compare only the pathname portion (ignore query/hash).
  const currentPath = window.location.pathname.split('/').pop() || '';
  if (currentPath) {
    // Try to find a link whose href ends with the currentPath
    const match = Array.from(navItems).find(a => {
      const href = a.getAttribute('href') || '';
      // normalize href (strip query/hash and leading path)
      const hrefFile = href.split('/').pop().split('?')[0].split('#')[0];
      return hrefFile === currentPath;
    });
    if (match) {
      clearActive();
      match.classList.add('active');
      return; // done
    }
  }

  // Fallback: if no pathname match, keep the first nav-item as active (optional)
  // clearActive();
  // navItems[0]?.classList.add('active');
});

