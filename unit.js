const API_KEY1 = 'G1ZRJBYJKMJ5UV9DQ8B41VTUMVXG943VTA';

async function getAllSuccessfulTransactions(startDate, endDate, address) {
    const BASE_URL = "https://api.blastscan.io/api";
    const endDateTimestamp = new Date(endDate).getTime() / 1000;
    const startDateTimestamp = new Date(startDate).getTime() / 1000;
    let allTransactions = [];
    let page = 1;
    const pageSize = 1000; // 设置每页获取的交易数

    while (true) {
        const params = {
            module: "account",
            action: "txlist",
            address: address,
            startblock: 0,
            endblock: 'latest',
            page: page,
            offset: pageSize,
            sort: 'asc',
            apikey: API_KEY1
        };

        // const response = await axios.get(BASE_URL, { params });
        const response = await axios.get(BASE_URL, { params })
            .catch(error => {
                console.error("Error fetching transactions:", error);
                throw error; // 继续将错误抛出以向上层传递
            });

        if (response.data.status === '1') {
            const transactions = response.data.result;
            allTransactions = allTransactions.concat(transactions);
            if (transactions.length < pageSize) break; // 如果返回的交易数量少于页面大小，说明已经是最后一页
            page++;
        } else {
            console.error("Error fetching transactions:", response.data.message);
            break;
        }
    }

    const successfulTransactions = allTransactions.filter(transaction => {
        const timestamp = parseInt(transaction.timeStamp);
        return timestamp >= startDateTimestamp && timestamp <= endDateTimestamp && transaction.txreceipt_status === '1';
    });

    return successfulTransactions;
}


async function autoFillDate(interval) {
    const startDateInput = document.getElementById("start");
    const endDateInput = document.getElementById("end");
    const today = new Date().toISOString().split('T')[0];

    if (interval === 'week') {
        console.log("操作week")
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoString = oneWeekAgo.toISOString().split('T')[0];
        startDateInput.value = oneWeekAgoString;
    } else if (interval === 'month') {
        console.log("操作month")
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
let isFetchingData = false; // 标志变量，表示是否正在获取数据

async function getData() {
    if (isFetchingData) {
        console.log("正在获取数据，请稍候...");
        return;
    }

    isFetchingData = true; // 设置标志变量为 true，表示开始获取数据

    try {
        console.log("开始执行getdata...");
        const startDate = document.getElementById("start").value;
        const endDate = document.getElementById("end").value;
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        if (startDate > endDate) {
            console.log("开始时间大于截止时间");
            alert("The start time cannot be greater than the end time!");
            destroyAllCharts();
            document.getElementById("summaryTableContainer").style.display = "none";
            disablePrintPDFButton();
            return;
        }

        const transactions = await getAllSuccessfulTransactions(startDate, endDate, address);

        destroyAllCharts();

        if (transactions.length > 0) {
            drawTransactionsChart(transactions, 'transactionsChart', 'Transaction');
            drawOutgoingChart(transactions, address, 'outgoingChart', 'Outgoing');
            drawIncomingChart(transactions, address, 'incomingChart', 'Incoming');
            updateSummaryTable(address, transactions);
            document.getElementById("summaryTableContainer").style.display = "block";
            enablePrintPDFButton();
        } else {
            alert("No transactions during this period!");
            document.getElementById("summaryTableContainer").style.display = "none";
            disablePrintPDFButton();
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        isFetchingData = false; // 不管获取数据成功或失败，都将标志变量重置为 false
    }
}

function destroyAllCharts() {
    try {
        destroyChart('transactionsChart');
        destroyChart('outgoingChart');
        destroyChart('incomingChart');
    } catch (error) {
        console.error("Error destroying previous charts:", error);
    }
}


function enablePrintPDFButton() {
    document.getElementById("printPDFButton").disabled = false;
}

function disablePrintPDFButton() {
    document.getElementById("printPDFButton").disabled = true;
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

function drawOutgoingChart(transactions, address, canvasId, chartTitle) {
    const outgoingTransactions = transactions.filter(transaction => (transaction.from.toLowerCase() === address.toLowerCase()));
    if (outgoingTransactions.length > 0) {
        drawAmountAndCountChart(outgoingTransactions, 'Outgoing', canvasId, 'rgba(255, 99, 132, 0.2)', 'rgba(255, 99, 132, 1)', chartTitle);
    }

}

function drawIncomingChart(transactions, address, canvasId, chartTitle) {
    const incomingTransactions = transactions.filter(transaction => (transaction.to.toLowerCase() === address.toLowerCase()));
    if (incomingTransactions.length > 0) {
        drawAmountAndCountChart(incomingTransactions, 'Incoming', canvasId, 'rgba(54, 162, 235, 0.2)', 'rgba(54, 162, 235, 1)', chartTitle);
    }

}

function drawTransactionsChart(transactions, canvasId, chartTitle) {
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
        color: '#fff',
        data: {
            labels: dateLabels,
            datasets: [{
                label: 'Transaction Count',
                data: transactionCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }, {
                label: 'Transaction Amount (ETH)',
                data: transactionAmounts,
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1,
                color: '#fff'
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: chartTitle,
                    fontSize: 18,
                    color: '#fff'
                }
            },
            scales: {
                xAxes: [{
                    ticks: {
                        color: '#fff',
                        maxTicksLimit: 7,
                        callback: function (value, index, values) {
                            return value.split('T')[0];
                        }
                    }
                }],
                yAxes: [{
                    ticks: {
                        color: '#fff',
                        beginAtZero: true
                    }
                }]
            }

        }
    });


}

function drawAmountAndCountChart(transactions, label, canvasId, backgroundColor, borderColor, chartTitle) {
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
            plugins: {
                title: {
                    display: true,
                    text: chartTitle, // 使用传递的标题参数作为标题文本
                    fontSize: 18,// 可选：标题字体大小
                    color: '#fff'
                }
            },
            scales: {
                yAxes: [{
                    ticks: {
                        color: '#fff',
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}
function downloadPDF() {
    // 调用之前定义的 createPDF 函数，将整个页面内容转换为PDF并下载
    createPDF('body', 'TransactionsAnalysis');
}
function createPDF(id, name) {
    let demo = document.getElementById(id);
    demo.style.overflow = 'visible';
    html2canvas(demo, {
        allowTaint: true, //允许跨域
        height: document.getElementById(id).scrollHeight, //
        width: document.getElementById(id).scrollWidth, //为了使横向滚动条的内容全部展示，这里必须指定
        background: "#FFFFFF", //如果指定的div没有设置背景色会默认成黑色
        onrendered: function (canvas) {
            var contentWidth = canvas.width;
            var contentHeight = canvas.height;

            //一页pdf显示html页面生成的canvas高度;
            var pageHeight = contentWidth / 595.28 * 841.89;
            //未生成pdf的html页面高度
            var leftHeight = 841.89;
            //pdf页面偏移
            var position = 0;
            //a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
            var imgWidth = 555.28;
            var imgHeight = 555.28 / contentWidth * contentHeight;

            var pageData = canvas.toDataURL('image/jpeg', 1.0);
            // // 获取 HTML 页面的宽度和高度
            var pdf = new jsPDF('l', 'pt', 'a4');
            //如果pdf文件的宽度小于html页面的宽度则改为一下代码：
            // var pdf = new jsPDF('', 'pt', [contentWidth, contentHeight]);
            //这里设置的是a4纸的大小，页面比较宽所以竖向显示
            if (leftHeight < pageHeight) {
                pdf.addImage(pageData, 'JPEG', 20, 0, imgWidth, imgHeight);
            } else {
                while (leftHeight > 0) {
                    pdf.addImage(pageData, 'JPEG', 20, position, imgWidth, imgHeight)
                    leftHeight -= pageHeight;
                    position -= 841;
                    //避免添加空白页
                    if (leftHeight > 0) {
                        pdf.addPage();
                    }
                }
            }

            pdf.save(name + '.pdf');
        }
    })
}

async function copyPDFLink() {
    try {
        // 生成 PDF 文件的 URL
        const pdfURL = await generatePDFURL();
        // 将 URL 复制到剪贴板
        await navigator.clipboard.writeText(pdfURL);
        alert("PDF link copied to clipboard! Share this link with others to download the PDF.");
    } catch (error) {
        console.error("Failed to copy PDF link:", error);
        alert("Failed to copy PDF link!");
    }
}
function generatePDFURL() {
    return new Promise(resolve => {
        const pdf = new jsPDF('l', 'pt', 'a4');

        // 获取要转换为 PDF 的 HTML 元素
        const element = document.getElementById('body');

        // 使用 html2canvas 将 HTML 元素转换为 PDF
        html2canvas(element, {
            allowTaint: true, //允许跨域
            height: element.scrollHeight, //页面内容高度
            width: element.scrollWidth, //页面内容宽度
            background: "#FFFFFF", //页面背景色
            onrendered: function (canvas) {
                var contentWidth = canvas.width;
                var contentHeight = canvas.height;

                //一页pdf显示html页面生成的canvas高度;
                var pageHeight = contentWidth / 595.28 * 841.89;
                //未生成pdf的html页面高度
                var leftHeight = 841.89;
                //pdf页面偏移
                var position = 0;
                //a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
                var imgWidth = 555.28;
                var imgHeight = 555.28 / contentWidth * contentHeight;

                var pageData = canvas.toDataURL('image/jpeg', 1.0);

                // 将 HTML 页面内容添加到 PDF 中
                pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight);

                // 将 PDF 文件保存到本地
                // pdf.save('TransactionsAnalysis.pdf');

                // 获取生成的 PDF 文件的 data URL
                const pdfURL = pdf.output('datauristring');
                resolve(pdfURL);
                //  resolve(encodeURIComponent(pdf.output('dataurlstring')));
            }
        });
    });
}

let debounceTimer;
function debounce(func, delay) {
    console.log("操作频繁了哈")
    return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

// let isFetchingData = false; // 标志变量，表示是否正在获取数据

// const getdatabutton = document.getElementById("getDataButton");
// getdatabutton.addEventListener("click", async function () {
//     if (isFetchingData) {
//         console.log("正在获取数据，请稍候...");
//         return;
//     }

//     isFetchingData = true; // 设置标志变量为 true，表示开始获取数据

//     try {
//         await getData();
//     } catch (error) {
//         console.error("Error fetching data:", error);
//     } finally {
//         isFetchingData = false; // 不管获取数据成功或失败，都将标志变量重置为 false
//     }
// });


// document.getElementById("getDataButton").addEventListener("click", debounce(getData, 300));

function updateSummaryTable(address, transactions) {
    const totalTransactions = transactions.length;
    const totalTransactionAmount = transactions.reduce((total, transaction) => total + parseFloat(transaction.value) / 1e18, 0);

    const totalOutgoingTransactions = transactions.filter(transaction => (transaction.from.toLowerCase() === address.toLowerCase())).length;
    const totalOutgoingTransactionAmount = transactions.filter(transaction => (transaction.from.toLowerCase() === address.toLowerCase())).reduce((total, transaction) => total + parseFloat(transaction.value) / 1e18, 0);

    const totalIncomingTransactions = transactions.filter(transaction => (transaction.to.toLowerCase() === address.toLowerCase())).length;
    const totalIncomingTransactionAmount = transactions.filter(transaction => (transaction.to.toLowerCase() === address.toLowerCase())).reduce((total, transaction) => total + parseFloat(transaction.value) / 1e18, 0);

    document.getElementById("totalTransactions").textContent = totalTransactions;
    document.getElementById("totalTransactionAmount").textContent = removeTrailingZeros(totalTransactionAmount.toFixed(6));
    document.getElementById("totalOutgoingTransactions").textContent = totalOutgoingTransactions;
    document.getElementById("totalOutgoingTransactionAmount").textContent = removeTrailingZeros(totalOutgoingTransactionAmount.toFixed(6));
    document.getElementById("totalIncomingTransactions").textContent = totalIncomingTransactions;
    document.getElementById("totalIncomingTransactionAmount").textContent = removeTrailingZeros(totalIncomingTransactionAmount.toFixed(6));
}