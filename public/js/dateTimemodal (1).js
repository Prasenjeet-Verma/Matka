
        function getHistory() {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            // Just a simple visual feedback for the demo
            const btn = document.querySelector('.btn-history');
            const originalText = btn.innerText;
            
            btn.innerText = "Loading...";
            btn.style.opacity = "0.8";
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.opacity = "1";
                alert(`Fetching history from ${startDate} to ${endDate}`);
            }, 800);
        }
