package com.example.service;

import com.example.model.Stock;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Random;

@Service
@EnableScheduling
public class StockUpdateService {
    
    private final StockService stockService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Random random = new Random();

    public StockUpdateService(StockService stockService, SimpMessagingTemplate messagingTemplate) {
        this.stockService = stockService;
        this.messagingTemplate = messagingTemplate;
    }

    // Обновява акциите на всеки 5 секунди
    @Scheduled(fixedRate = 5000)
    public void updateStockPrices() {
        List<Stock> stocks = stockService.getWatchlistStocks();
        
        // Симулира промени в цените
        for (Stock stock : stocks) {
            // Произволна промяна между -2% и +2%
            double changePercent = (random.nextDouble() - 0.5) * 4;
            BigDecimal currentPrice = stock.getCurrentPrice();
            BigDecimal newPrice = currentPrice.add(
                currentPrice.multiply(BigDecimal.valueOf(changePercent / 100))
            ).setScale(2, RoundingMode.HALF_UP);
            
            BigDecimal previousClose = stock.getPreviousClose();
            BigDecimal totalChange = newPrice.subtract(previousClose)
                .divide(previousClose, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
            
            stock.setCurrentPrice(newPrice);
            stock.setChangePercent(totalChange);
            
            // Симулира промяна в обема
            long volumeChange = (long) (random.nextDouble() * 1000000);
            stock.setVolume(stock.getVolume() + volumeChange);
        }
        
        // Изпраща обновените данни чрез WebSocket
        messagingTemplate.convertAndSend("/topic/stocks", stocks);
    }
}
