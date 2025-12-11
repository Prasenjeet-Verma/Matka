
function getHistory() {
    const dataSource = document.getElementById('dataSource').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    window.location.href = `/bets?source=${dataSource}&start=${start}&end=${end}`;
}

