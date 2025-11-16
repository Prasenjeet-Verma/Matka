
        function handleLogin() {
            const username = document.getElementById('username').value;
            // In a real application, you would handle authentication here.
            
            // Display a message instead of using alert()
            const loginCard = document.getElementById('login-card');
            const messageBox = document.createElement('div');
            messageBox.className = 'absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6 rounded-2xl text-center';
            messageBox.innerHTML = `
                <div class="bg-red-50 p-6 rounded-xl shadow-xl border border-red-300">
                    <p class="text-xl font-bold text-red-700 mb-3">Login Attempted!</p>
                    <p class="text-gray-600">Username: <span class="font-mono text-red-800">${username}</span></p>
                    <p class="text-sm text-gray-500 mt-4">This is a frontend demonstration. No actual authentication was performed.</p>
                    <button onclick="this.parentNode.parentNode.remove()" class="mt-5 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                        OK
                    </button>
                </div>
            `;
            loginCard.appendChild(messageBox);
        }
