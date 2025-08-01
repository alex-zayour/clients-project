const tickerInput = document.getElementById('stock-ticker-input');
const fetchButton = document.getElementById('fetch-button');
const analysisOutput = document.getElementById('analysis-output');
const chartCanvas = document.getElementById('stock-chart');
let stockChart;

fetchButton.addEventListener('click', () => {
    const ticker = tickerInput.value.trim().toUpperCase();
    if (!ticker) {
        analysisOutput.textContent = 'Please enter a stock ticker.';
        return;
    }
    fetchStockData(ticker);
});

async function fetchStockData(ticker) {
    // IMPORTANT: Replace 'YOUR_API_KEY_HERE' with your actual free API key from Alpha Vantage.
    // Get your free key here: https://www.alphavantage.co/support/#api-key
    const apiKey = 'YOUR_API_KEY_HERE';
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${apiKey}`;

    analysisOutput.textContent = `Fetching data for ${ticker}...`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data['Error Message']) throw new Error(data['Error Message']);
        if (data['Note']) {
            analysisOutput.textContent = `API Note: ${data['Note']}. Please wait and try again.`;
            console.warn(data['Note']);
            return;
        }

        renderChart(data, ticker);
        analysisOutput.textContent = `Displaying daily prices for ${ticker}.`;

    } catch (error) {
        console.error('Error fetching stock data:', error);
        analysisOutput.textContent = `Error: ${error.message}`;
    }
}

function calculateSMA(data, period) {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - (period - 1), i + 1).reduce((acc, val) => acc + val, 0);
        sma.push(sum / period);
    }
    // Pad with nulls to align with the original data array on the chart
    return Array(period - 1).fill(null).concat(sma);
}

function calculateLinearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((_, i) => slope * i + intercept);
}

function renderChart(apiData, ticker) {
    const timeSeries = apiData['Time Series (Daily)'];
    if (!timeSeries) {
        analysisOutput.textContent = 'No time series data found for this ticker.';
        return;
    }

    const dates = Object.keys(timeSeries).reverse();
    const closingPrices = dates.map(date => parseFloat(timeSeries[date]['4. close']));

    const sma50 = calculateSMA(closingPrices, 50);
    const trendLine = calculateLinearRegression(closingPrices);

    const datasets = [{
        label: `Closing Price for ${ticker}`,
        data: closingPrices,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.1
    }, {
        label: '50-Day SMA',
        data: sma50,
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1
    }, {
        label: 'Trend Line',
        data: trendLine,
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
        borderDash: [5, 5]
    }];

    if (closingPrices.length >= 200) {
        const sma200 = calculateSMA(closingPrices, 200);
        datasets.push({
            label: '200-Day SMA',
            data: sma200,
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1
        });
    }

    if (stockChart) {
        stockChart.destroy();
    }

    const ctx = chartCanvas.getContext('2d');
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
            scales: {
                x: {
                        title: { display: true, text: 'Date', color: '#fff' },
                        ticks: { color: '#fff' },
                        grid: { color: 'rgba(255, 255, 255, 0.2)' }
                },
                y: {
                        title: { display: true, text: 'Price (USD)', color: '#fff' },
                        ticks: { callback: value => '$' + value.toFixed(2), color: '#fff' },
                        grid: { color: 'rgba(255, 255, 255, 0.2)' }
                }
            },
            plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#fff'
                        }
                    },
                    title: {
                        display: true,
                        text: `Stock Price History for ${ticker}`,
                        color: '#fff',
                        font: {
                            size: 18
                        }
                    }
            }
        }
    });
}
