let stompClient = null;
let isConnected = false;

function formatTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function updateStocksDisplay(stocks) {
    const container = document.getElementById('stocks-container');
    container.innerHTML = stocks.map(stock => `
        <div class="stock-card">
            <div class="symbol">${stock.symbol}</div>
            <div class="company-name">${stock.companyName}</div>
            <div class="price">$${stock.currentPrice.toFixed(2)}</div>
            <div class="change ${stock.changePercent >= 0 ? 'positive' : 'negative'}">
                ${stock.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(stock.changePercent).toFixed(2)}%
            </div>
            <div class="volume">
                Обем: ${stock.volume.toLocaleString('bg-BG')}
            </div>
        </div>
    `).join('');
    
    document.getElementById('update-time').textContent = formatTime();
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
            updateStocksDisplay(stocks);
        });
    }, function(error) {
        console.error('WebSocket connection error:', error);
        isConnected = false;
        // Опит за повторно свързване след 5 секунди
        setTimeout(connect, 5000);
    });
}

// Първоначално зареждане на данни
fetch('/api/stocks')
    .then(response => response.json())
    .then(data => {
        updateStocksDisplay(data);
    })
    .catch(error => {
        console.error('Грешка при зареждане на данни:', error);
    });

// Свързване към WebSocket
connect();

// Показва текущото време
document.getElementById('update-time').textContent = formatTime();
