
const API_KEY1 = 'ZQW9Q75PC212BH4QV9BP4NAWJSK2S4EHNQ';

async function getAllSuccessfulTransactions(startDate, endDate, address) {
    try {
        const endDateTimestamp = new Date(endDate).getTime() / 1000;
        const startDateTimestamp = new Date(startDate).getTime() / 1000;

        const BASE_URL = "https://api.blastscan.io/api";
        const params = {
            module: "account",
            action: "txlist",
            address: address,
            startblock: 0,
            endblock: 'latest',
            page: 1,
            offset: 10000,
            sort: 'asc',
            apikey: API_KEY1
        };

        const response = await axios.get(BASE_URL, { params });
        if (response.data.status === '1') {
            const transactions = response.data.result;
            const successfulTransactions = transactions.filter(transaction => {
                const timestamp = parseInt(transaction.timeStamp);
                return timestamp >= startDateTimestamp && timestamp <= endDateTimestamp && transaction.txreceipt_status === '1';
            });
            return successfulTransactions;
        } else {
            console.error("Error fetching transactions:", response.data.message);
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return [];
    }
}

async function autoFillDate(interval) {
    const startDateInput = document.getElementById("start");
    const endDateInput = document.getElementById("end");
    const today = new Date().toISOString().split('T')[0];

    if (interval === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoString = oneWeekAgo.toISOString().split('T')[0];
        startDateInput.value = oneWeekAgoString;
    } else if (interval === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const oneMonthAgoString = oneMonthAgo.toISOString().split('T')[0];
        startDateInput.value = oneMonthAgoString;
    }

    endDateInput.value = today;
}
// 定义一个函数，用于去除小数点后面的零
function removeTrailingZeros(number) {
    // 转换为字符串，并去除尾部的零和小数点
    return parseFloat(number).toString();
}
async function getData() {
    const startDate = document.getElementById("start").value;
    const endDate = document.getElementById("end").value;
    const address = "0x6BC58Daa01464c9A0a81aEa8145a335e46F24E36";

    // 检查开始时间是否大于结束时间
    if (startDate > endDate) {
        alert("The start time cannot be greater than the end time!");
        try {
            destroyChart('transactionsChart');
            destroyChart('outgoingChart');
            destroyChart('incomingChart');

        } catch (error) {
            console.error("Error destroying previous charts:", error);
        }
        document.getElementById("summaryTableContainer").style.display = "none";
        return; // 如果是，则直接返回，不执行后续操作
    }

    const transactions = await getAllSuccessfulTransactions(startDate, endDate, address);

    try {
        destroyChart('transactionsChart');
        destroyChart('outgoingChart');
        destroyChart('incomingChart');
    } catch (error) {
        console.error("Error destroying previous charts:", error);
    }
    if (transactions.length > 0) {
        drawTransactionsChart(transactions, 'transactionsChart');
        drawOutgoingChart(transactions, address, 'outgoingChart');
        drawIncomingChart(transactions, address, 'incomingChart');

        // 在此处调用 updateSummaryTable 函数，将 address 和 transactions 传递给它
        updateSummaryTable(address, transactions);
        document.getElementById("summaryTableContainer").style.display = "block";
    } else {
        alert("No transactions during this period!");
        document.getElementById("summaryTableContainer").style.display = "none";
    }
}


// function destroyChart(canvasId) {
//     const canvas = document.getElementById(canvasId);
//     if (!canvas) {
//         console.error("Canvas element not found for ID:", canvasId);
//         return;
//     }

//     const ctx = canvas.getContext('2d');
//     if (!ctx) {
//         console.error("Failed to get 2D context for canvas with ID:", canvasId);
//         return;
//     }
//     // Clear the canvas content
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     Chart.getChart(canvas).destroy(); // Destroy the chart associated with this canvas
// }
function destroyChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas element not found for ID:", canvasId);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Failed to get 2D context for canvas with ID:", canvasId);
        return;
    }

    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        // Clear the canvas content
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        existingChart.destroy(); // Destroy the chart associated with this canvas
    } else {
        console.warn("No existing chart found for canvas with ID:", canvasId);
    }
}

function drawOutgoingChart(transactions, address, canvasId) {
    const outgoingTransactions = transactions.filter(transaction => (transaction.from.toLowerCase() === address.toLowerCase()));
    if (outgoingTransactions.length > 0) {
        drawAmountAndCountChart(outgoingTransactions, 'Outgoing', canvasId, 'rgba(255, 99, 132, 0.2)', 'rgba(255, 99, 132, 1)');
    }

}

function drawIncomingChart(transactions, address, canvasId) {
    const incomingTransactions = transactions.filter(transaction => (transaction.to.toLowerCase() === address.toLowerCase()));
    if (incomingTransactions.length > 0) {
        drawAmountAndCountChart(incomingTransactions, 'Incoming', canvasId, 'rgba(54, 162, 235, 0.2)', 'rgba(54, 162, 235, 1)');
    }

}

function drawTransactionsChart(transactions, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas element not found for ID:", canvasId);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Failed to get 2D context for canvas with ID:", canvasId);
        return;
    }

    const dateLabels = [];
    const transactionCounts = [];
    const transactionAmounts = [];

    transactions.forEach(transaction => {
        const date = new Date(parseInt(transaction.timeStamp) * 1000);
        const dateString = date.toISOString().split('T')[0];

        if (!dateLabels.includes(dateString)) {
            dateLabels.push(dateString);
            transactionCounts.push(0);
            transactionAmounts.push(0);
        }

        const index = dateLabels.indexOf(dateString);
        transactionCounts[index]++;
        transactionAmounts[index] += parseFloat(transaction.value) / 1e18;
    });

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: [{
                label: 'Transaction Count',
                data: transactionCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }, {
                label: 'Transaction Amount (ETH)',
                data: transactionAmounts,
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}

function drawAmountAndCountChart(transactions, label, canvasId, backgroundColor, borderColor) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas element not found for ID:", canvasId);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Failed to get 2D context for canvas with ID:", canvasId);
        return;
    }

    const dateLabels = [];
    const transactionCounts = [];
    const transactionAmounts = [];

    transactions.forEach(transaction => {
        const date = new Date(parseInt(transaction.timeStamp) * 1000);
        const dateString = date.toISOString().split('T')[0];

        if (!dateLabels.includes(dateString)) {
            dateLabels.push(dateString);
            transactionCounts.push(0);
            transactionAmounts.push(0);
        }

        const index = dateLabels.indexOf(dateString);
        transactionCounts[index]++;
        transactionAmounts[index] += parseFloat(transaction.value) / 1e18;
    });

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: [{
                label: `${label} Count`,
                data: transactionCounts,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1
            }, {
                label: `${label} Amount (ETH)`,
                data: transactionAmounts,
                backgroundColor: 'rgba(255, 206, 86, 0.2)',
                borderColor: 'rgba(255, 206, 86, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}

function updateSummaryTable(address, transactions) {
    const totalTransactions = transactions.length;
    let totalTransactionAmount = 0;
    let totalOutgoingTransactions = 0;
    let totalOutgoingTransactionAmount = 0;
    let totalIncomingTransactions = 0;
    let totalIncomingTransactionAmount = 0;

    transactions.forEach(transaction => {
        const value = parseFloat(transaction.value) / 1e18;
        if (transaction.from.toLowerCase() === address.toLowerCase()) {
            totalOutgoingTransactions++;
            totalOutgoingTransactionAmount += value;
        }
        if (transaction.to.toLowerCase() === address.toLowerCase()) {
            totalIncomingTransactions++;
            totalIncomingTransactionAmount += value;
        }
        totalTransactionAmount += value;
    });

    document.getElementById("totalTransactions").textContent = totalTransactions;
    document.getElementById("totalTransactionAmount").textContent = removeTrailingZeros(totalTransactionAmount.toFixed(6));
    document.getElementById("totalOutgoingTransactions").textContent = totalOutgoingTransactions;
    document.getElementById("totalOutgoingTransactionAmount").textContent = removeTrailingZeros(totalOutgoingTransactionAmount.toFixed(6));
    document.getElementById("totalIncomingTransactions").textContent = totalIncomingTransactions;
    document.getElementById("totalIncomingTransactionAmount").textContent = removeTrailingZeros(totalIncomingTransactionAmount.toFixed(6));
}
