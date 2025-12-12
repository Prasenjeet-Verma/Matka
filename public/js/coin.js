const BASE_URL = window.location.origin;
const amountChipsButtons = document.querySelectorAll(".chip-button");
const btnTail = document.getElementById("Tails");
const btnHead = document.getElementById("Heads");
const userTotalBalance = document.getElementById("user-wallet");
const coin = document.getElementById("coin");
let selectedChip = null;
let rotation = 0;

function updateWallet(amount) {
  userTotalBalance.textContent = `₹ ${parseFloat(amount).toFixed(2)}`;
}

function disablePick(){ btnHead.disabled = true; btnTail.disabled = true;}
function enablePick(){ btnHead.disabled = false; btnTail.disabled = false;}
function disableChips(){ amountChipsButtons.forEach(chip => chip.disabled = true);}
function enableChips(){ amountChipsButtons.forEach(chip => chip.disabled = false);}

amountChipsButtons.forEach(chip => {
  chip.addEventListener("click", () => {
    const amountValue = parseInt(chip.getAttribute("data-value"));
    if(selectedChip) selectedChip.classList.remove("selected");
    chip.classList.add("selected");
    selectedChip = chip;

    if(isNaN(amountValue) || amountValue<=0 || amountValue>parseFloat(userTotalBalance.textContent.replace(/[^\d.-]/g,''))){
      showMessage("Enter valid amount", "bg-red-600");
      return;
    }

    fetch(`${BASE_URL}/coin`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ fixBetAmount: amountValue })
    }).then(res=>res.json()).then(data=>{
      if(data.error){ showMessage(data.error,"bg-red-600"); return resetUI(); }
      if(data.remainingBalance !== undefined){ updateWallet(data.remainingBalance); enablePick();}
      else { showMessage("Unexpected response", "bg-red-600"); resetUI();}
    }).catch(err=>{ console.error(err); showMessage("Server error", "bg-red-600"); resetUI();});
  });
});

// Head/Tail pick
[btnHead, btnTail].forEach(button => {
  button.addEventListener("click", () => {
    disablePick(); disableChips();
    const userChoice = parseInt(button.getAttribute("degree"),10);
    if(isNaN(userChoice)){ showMessage("Invalid choice","bg-red-600"); return; }

    fetch(`${BASE_URL}/coin`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ userChoice })
    }).then(res=>res.json()).then(data=>{
      if(data.error){ showMessage(data.error,"bg-red-600"); resetUI(); return; }

      let spinInterval = setInterval(()=>{
        rotation += 360;
        coin.style.transform = `rotateY(${rotation}deg)`;
      },300);

      setTimeout(()=>{
        clearInterval(spinInterval);
        fetch(`${BASE_URL}/coin`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ timeOut:true })
        }).then(res=>res.json()).then(data=>{
          if(data.error){ showMessage(data.error,"bg-red-600"); resetUI(); return; }

          rotation = data.rotation;
          coin.style.transform = `rotateY(${rotation}deg)`;

          setTimeout(()=>{
            if(data.totalProfit!==undefined){ updateWallet(data.remainingBalance); showMessage(`You Won! 🎉 +${data.totalProfit}`,"bg-green-600"); setTimeout(()=>{ showMessage("Game Resetting...","bg-black"); resetUI(); },1500);}
            if(data.totalLoss!==undefined){ updateWallet(data.remainingBalance); showMessage(`You Lost! ❌ -${data.totalLoss}`,"bg-red-600"); setTimeout(()=>{ showMessage("Game Resetting...","bg-black"); resetUI(); },1500);}
          },800);

        });
      },3000);

    });
  });
});

function resetUI(){
  if(selectedChip){ selectedChip.classList.remove("selected"); selectedChip=null;}
  rotation=0; coin.style.transition="transform 0.5s ease-out"; coin.style.transform="rotateY(0deg)";
  setTimeout(()=>coin.style.transition="",600);
  enableChips(); disablePick();
}

// Show messages
function showMessage(text,bgColor="bg-gray-800"){
  let container = document.getElementById("messageContainer");
  if(!container){
    container = document.createElement("div"); container.id="messageContainer";
    container.className=`fixed top-[5%] left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-xl text-white font-semibold shadow-2xl ${bgColor} animate-[slideIn_0.5s_forwards]`;
    container.textContent=text; document.body.appendChild(container);
  } else { container.textContent=text; container.style.backgroundColor=bgColor; }
  setTimeout(()=>{ container.remove(); },3500);
}
