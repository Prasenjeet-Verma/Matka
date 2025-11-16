
    // run after DOM ready to avoid timing issues
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM ready — tab script starting');

      const unsettledTab = document.getElementById('unsettledTab');
      const settledTab   = document.getElementById('settledTab');
      const unsettledSection = document.getElementById('unsettledSection');
      const settledSection   = document.getElementById('settledSection');

      // sanity checks
      if(!unsettledTab || !settledTab || !unsettledSection || !settledSection){
        console.error('One or more elements not found:', {unsettledTab, settledTab, unsettledSection, settledSection});
        return;
      } else {
        console.log('All elements found. Ready to attach listeners.');
      }

      function showUnsettled(){
        console.log('showUnsettled called');
        unsettledTab.classList.add('active');
        unsettledTab.setAttribute('aria-selected','true');
        settledTab.classList.remove('active');
        settledTab.setAttribute('aria-selected','false');

        unsettledSection.classList.add('active');
        settledSection.classList.remove('active');
      }

      function showSettled(){
        console.log('showSettled called');
        settledTab.classList.add('active');
        settledTab.setAttribute('aria-selected','true');
        unsettledTab.classList.remove('active');
        unsettledTab.setAttribute('aria-selected','false');

        settledSection.classList.add('active');
        unsettledSection.classList.remove('active');
      }

      // attach click listeners
      unsettledTab.addEventListener('click', showUnsettled);
      settledTab.addEventListener('click', showSettled);

      // keyboard accessibility: left/right arrows and Enter/Space to toggle
      document.addEventListener('keydown', (e) => {
        const activeEl = document.activeElement;
        if(activeEl === unsettledTab || activeEl === settledTab){
          if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
            e.preventDefault();
            if(activeEl === unsettledTab) settledTab.focus();
            else unsettledTab.focus();
          } else if(e.key === 'Enter' || e.key === ' '){
            e.preventDefault();
            if(activeEl === unsettledTab) showUnsettled();
            else showSettled();
          }
        }
      });

      // optional: allow clicking anywhere on the tab container area to switch
      // (already handled above)
    });