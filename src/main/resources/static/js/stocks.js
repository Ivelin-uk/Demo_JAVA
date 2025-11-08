// Регистрация на финансовия плагин (candlestick) и задължителни компоненти, ако са налични
(() => {
    try {
        // chartjs-chart-financial UMD излага обект в window['chartjs-chart-financial']
        const fin = window['chartjs-chart-financial'];
        if (fin && window.Chart) {
            const { CandlestickController, CandlestickElement, OhlcController, OhlcElement } = fin;
            if (CandlestickController && CandlestickElement) {
                window.Chart.register(CandlestickController, CandlestickElement);
            }
            if (OhlcController && OhlcElement) {
                window.Chart.register(OhlcController, OhlcElement);
            }
        }
    } catch (e) {
        console.warn('Chart financial plugin registration skipped:', e);
    }
})();

let stompClient = null;
let isConnected = false;
let allStocks = [];
let selectedStock = null;
let stockChart = null;
let priceHistory = new Map(); // Съхранява история на цените за всяка акция (tick-и)
let candleHistory = new Map(); // Съхранява базови свещи (по 5s) за всяка акция
let selectedInterval = '5s'; // 5s, 1m, 5m, 1h
let chartUpdateTimer = null; // debounce таймер за обновяване на графиката
let lineHistory = new Map(); // История за линейна графика (fallback / basic)
let chartRendering = false; // лок за предотвратяване на паралелни рендъри
let pendingSymbol = null;   // отложено обновяване, ако се натрупат заявки

function formatTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function updateStocksList(stocks) {
    allStocks = stocks;
    const list = document.getElementById('stocks-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    // Филтрира според търсенето
    const filteredStocks = stocks.filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm) || 
        stock.companyName.toLowerCase().includes(searchTerm)
    );
    
    list.innerHTML = filteredStocks.map(stock => `
        <li class="stock-item ${selectedStock && selectedStock.symbol === stock.symbol ? 'active' : ''}" 
            data-symbol="${stock.symbol}">
            <div class="stock-info">
                <div class="stock-symbol">${stock.symbol}</div>
                <div class="stock-name">${stock.companyName}</div>
            </div>
            <div class="stock-price-info">
                <div class="stock-price">$${stock.currentPrice.toFixed(2)}</div>
                <div class="stock-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}">
                    ${stock.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(stock.changePercent).toFixed(2)}%
                </div>
            </div>
        </li>
    `).join('');
    
    document.getElementById('stocks-count').textContent = filteredStocks.length;
    
    // Добавя event listeners за кликване
    document.querySelectorAll('.stock-item').forEach(item => {
        item.addEventListener('click', function() {
            const symbol = this.getAttribute('data-symbol');
            selectStock(symbol);
        });
    });
    
    // Обновява историята на цените и базови свещи (5s)
    stocks.forEach(stock => {
        if (!priceHistory.has(stock.symbol)) {
            priceHistory.set(stock.symbol, []);
        }
        if (!candleHistory.has(stock.symbol)) {
            candleHistory.set(stock.symbol, []);
        }
        if (!lineHistory.has(stock.symbol)) {
            lineHistory.set(stock.symbol, []);
        }
        const history = priceHistory.get(stock.symbol);
        const now = new Date();
        const prev = history.length > 0 ? history[history.length - 1].price : stock.currentPrice;
        history.push({ time: now, price: stock.currentPrice });

        // Добавяме базова свещ (5 секунди)
        const candles = candleHistory.get(stock.symbol);
        const candle = {
            x: now,                     // време
            o: prev,                    // open = предишна цена
            h: Math.max(prev, stock.currentPrice),
            l: Math.min(prev, stock.currentPrice),
            c: stock.currentPrice       // close = текуща цена
        };
        candles.push(candle);
        // Пази само последните 300 свещи (~25 мин при 5s)
        if (candles.length > 300) candles.shift();
        // Пази само последните 20 стойности
        if (history.length > 20) {
            history.shift();
        }

        // Линейна история (до 1000 точки)
        const lHist = lineHistory.get(stock.symbol);
        lHist.push({ x: now, y: stock.currentPrice });
        if (lHist.length > 1000) lHist.shift();
    });
    
    // Обновява графиката ако има избрана акция
    if (selectedStock) {
        const currentStock = stocks.find(s => s.symbol === selectedStock.symbol);
        if (currentStock) {
            updateChartDisplay(currentStock);
        }
    }
    
    document.getElementById('update-time').textContent = formatTime();
}

function selectStock(symbol) {
    selectedStock = allStocks.find(s => s.symbol === symbol);
    if (selectedStock) {
        // Обнови визуално активния елемент в списъка, без да презареждаш целия списък
        document.querySelectorAll('.stock-item').forEach(li => {
            li.classList.toggle('active', li.getAttribute('data-symbol') === symbol);
        });
        showChart();
        updateChartDisplay(selectedStock);
    }
}

function showChart() {
    document.getElementById('chart-section').style.display = 'none';
    document.getElementById('chart-container').style.display = 'block';
}

function updateChartDisplay(stock) {
    document.getElementById('selected-stock-name').textContent = stock.companyName;
    document.getElementById('selected-stock-symbol').textContent = stock.symbol;
    document.getElementById('selected-stock-price').textContent = `$${stock.currentPrice.toFixed(2)}`;
    
    const changeElement = document.getElementById('selected-stock-change');
    changeElement.textContent = `${stock.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(stock.changePercent).toFixed(2)}%`;
    changeElement.className = `chart-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}`;
    
    updateChart(stock.symbol);
}

function updateChart(symbol) {
    // Debounce, за да избегнем създаване на множество графики едновременно
    if (chartUpdateTimer) clearTimeout(chartUpdateTimer);
    chartUpdateTimer = setTimeout(() => {
        if (chartRendering) {
            // ако вече рендърваме, отложи последната заявка
            pendingSymbol = symbol;
            return;
        }
        chartRendering = true;
        const baseCandles = candleHistory.get(symbol) || [];
        const lineData = lineHistory.get(symbol) || [];

        if (baseCandles.length === 0 && lineData.length === 0) {
            console.log('[chart] Няма данни още за', symbol);
            return; // все още не са пристигнали обновления
        }

        const canvas = document.getElementById('stockChart');
        if (!canvas) return;

        // Унищожи всяка съществуваща графика върху този canvas (дори ако не е в stockChart референцията)
        if (window.Chart && typeof window.Chart.getChart === 'function') {
            const existing = window.Chart.getChart(canvas);
            if (existing) {
                try { existing.destroy(); } catch (e) { console.warn('Destroy existing chart failed:', e); }
            }
        }
        if (stockChart) {
            try { stockChart.destroy(); } catch (e) { console.warn('Destroy stockChart failed:', e); }
            stockChart = null;
        }

        const data = resampleCandles(baseCandles, selectedInterval);
        const canUseCandles = data && data.length > 0 && typeof Chart.registry?.controllers?.get === 'function' ? true : (data && data.length > 0);

        // Ако вече има линейна графика и няма нови свещи -> просто обнови линейните точки
        if (stockChart && stockChart.config.type === 'line' && (!canUseCandles)) {
            stockChart.data.datasets[0].data = lineData.slice(-300);
            stockChart.update('none');
            return;
        }

        // Подай директно canvas елемента към Chart за по-надеждно асоцииране
        if (canUseCandles) {
            try {
                stockChart = new Chart(canvas, {
                    type: 'candlestick',
                    data: {
                        datasets: [{
                            label: 'OHLC',
                            data: data,
                            color: { up: '#16a34a', down: '#dc2626', unchanged: '#9ca3af' },
                            borderColor: '#111827',
                            borderWidth: 1
                        }]
                    },
                    options: baseChartOptions()
                });
                // успешен рендър на свещи
                chartRendering = false;
                if (pendingSymbol) {
                    const next = pendingSymbol; pendingSymbol = null;
                    // микрозакъснение за да приключи destroy/attach
                    setTimeout(() => updateChart(next), 0);
                }
                return;
            } catch (err) {
                console.warn('[chart] Candlestick failed -> line fallback', err);
            }
        }

        // Линеен fallback (или ако няма още достатъчно свещи)
        const linePoints = (data && data.length > 0 ? data.map(d => ({ x: d.x, y: d.c })) : lineData).slice(-300);
        stockChart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: symbol,
                    data: linePoints,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 0
                }]
            },
            options: baseChartOptions()
        });
        chartRendering = false;
        if (pendingSymbol) {
            const next = pendingSymbol; pendingSymbol = null;
            setTimeout(() => updateChart(next), 0);
        }
    }, 50);
}


function baseChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0,0,0,0.9)',
                displayColors: false
            }
        },
        interaction: { intersect: false, mode: 'index' },
        scales: {
            x: {
                type: 'time',
                time: { tooltipFormat: 'HH:mm:ss' },
                grid: { display: false },
                ticks: { color: '#999' }
            },
            y: {
                position: 'right',
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: {
                    color: '#999',
                    callback: (val) => `$${Number(val).toFixed(2)}`
                }
            }
        }
    };
}
function resampleCandles(candles, interval) {
    const ms = intervalToMs(interval);
    if (interval === '5s') return candles.slice(-120); // последните ~10 мин
    const buckets = new Map();
    for (const c of candles) {
        const t = (c.x instanceof Date) ? c.x.getTime() : new Date(c.x).getTime();
        const bucket = Math.floor(t / ms) * ms;
        if (!buckets.has(bucket)) {
            buckets.set(bucket, { x: new Date(bucket), o: c.o, h: c.h, l: c.l, c: c.c, firstT: t, lastT: t });
        } else {
            const b = buckets.get(bucket);
            // High/Low
            b.h = Math.max(b.h, c.h);
            b.l = Math.min(b.l, c.l);
            // Open = най-ранната
            if (t < b.firstT) { b.o = c.o; b.firstT = t; }
            // Close = най-късната
            if (t >= b.lastT) { b.c = c.c; b.lastT = t; }
        }
    }
    const result = Array.from(buckets.entries()).sort((a,b)=>a[0]-b[0]).map(([,v])=>({ x: v.x, o: v.o, h: v.h, l: v.l, c: v.c }));
    return result.slice(-120);
}

function intervalToMs(interval) {
    switch (interval) {
        case '5s': return 5 * 1000;
        case '1m': return 60 * 1000;
        case '5m': return 5 * 60 * 1000;
        case '1h': return 60 * 60 * 1000;
        default: return 5 * 1000;
    }
}

function connect() {
    const socket = new SockJS('/ws-stocks');
    stompClient = Stomp.over(socket);
    
    stompClient.connect({}, function(frame) {
        console.log('Connected: ' + frame);
        isConnected = true;
        
        // Абонира се за обновления в реално време
        stompClient.subscribe('/topic/stocks', function(message) {
            const stocks = JSON.parse(message.body);
            updateStocksList(stocks);
        });
    }, function(error) {
        console.error('WebSocket connection error:', error);
        isConnected = false;
        // Опит за повторно свързване след 5 секунди
        setTimeout(connect, 5000);
    });
}

// Търсачка
document.getElementById('search-input').addEventListener('input', function() {
    updateStocksList(allStocks);
});

// Първоначално зареждане на данни
fetch('/api/stocks')
    .then(response => response.json())
    .then(data => {
        updateStocksList(data);
    })
    .catch(error => {
        console.error('Грешка при зареждане на данни:', error);
    });

// Свързване към WebSocket
connect();

// Показва текущото време
document.getElementById('update-time').textContent = formatTime();

// Интервали
document.querySelectorAll('.interval-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedInterval = btn.getAttribute('data-interval');
        if (selectedStock) {
            updateChart(selectedStock.symbol);
        }
    });
});
