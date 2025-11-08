package com.example.service;

import com.example.model.Stock;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class StockService {
    private final WebClient webClient;

    public StockService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://financialmodelingprep.com/api/v3")
                .build();
    }

    public List<Stock> getWatchlistStocks() {
        List<Stock> stocks = new ArrayList<>();
        
        // Зареждане на няколко популярни акции
        String[] symbols = {"AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"};
        
        for (String symbol : symbols) {
            try {
                Stock stock = getStockQuote(symbol);
                if (stock != null) {
                    stocks.add(stock);
                }
            } catch (Exception e) {
                System.err.println("Error fetching " + symbol + ": " + e.getMessage());
            }
        }
        
        return stocks;
    }

    public Stock getStockQuote(String symbol) {
        try {
            // Използваме безплатен API без нужда от ключ
            JsonNode response = webClient.get()
                    .uri("/quote/{symbol}?apikey=demo", symbol)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response != null && response.isArray() && response.size() > 0) {
                JsonNode quote = response.get(0);
                
                Stock stock = new Stock();
                stock.setSymbol(quote.get("symbol").asText());
                stock.setCompanyName(quote.get("name").asText());
                stock.setCurrentPrice(new BigDecimal(quote.get("price").asText()).setScale(2, RoundingMode.HALF_UP));
                stock.setPreviousClose(new BigDecimal(quote.get("previousClose").asText()).setScale(2, RoundingMode.HALF_UP));
                stock.setChangePercent(new BigDecimal(quote.get("changesPercentage").asText()).setScale(2, RoundingMode.HALF_UP));
                stock.setVolume(quote.get("volume").asLong());
                
                return stock;
            }
        } catch (Exception e) {
            System.err.println("Error fetching stock data: " + e.getMessage());
        }
        
        // Fallback данни ако API не работи
        return createDemoStock(symbol);
    }

    private Stock createDemoStock(String symbol) {
        Stock stock = new Stock();
        stock.setSymbol(symbol);
        
        switch (symbol) {
            case "AAPL":
                stock.setCompanyName("Apple Inc.");
                stock.setCurrentPrice(new BigDecimal("178.25"));
                stock.setPreviousClose(new BigDecimal("175.50"));
                stock.setChangePercent(new BigDecimal("1.57"));
                stock.setVolume(52000000L);
                break;
            case "GOOGL":
                stock.setCompanyName("Alphabet Inc.");
                stock.setCurrentPrice(new BigDecimal("141.80"));
                stock.setPreviousClose(new BigDecimal("140.20"));
                stock.setChangePercent(new BigDecimal("1.14"));
                stock.setVolume(28000000L);
                break;
            case "MSFT":
                stock.setCompanyName("Microsoft Corporation");
                stock.setCurrentPrice(new BigDecimal("378.91"));
                stock.setPreviousClose(new BigDecimal("375.00"));
                stock.setChangePercent(new BigDecimal("1.04"));
                stock.setVolume(31000000L);
                break;
            case "TSLA":
                stock.setCompanyName("Tesla, Inc.");
                stock.setCurrentPrice(new BigDecimal("242.84"));
                stock.setPreviousClose(new BigDecimal("248.50"));
                stock.setChangePercent(new BigDecimal("-2.28"));
                stock.setVolume(95000000L);
                break;
            case "AMZN":
                stock.setCompanyName("Amazon.com, Inc.");
                stock.setCurrentPrice(new BigDecimal("145.32"));
                stock.setPreviousClose(new BigDecimal("143.80"));
                stock.setChangePercent(new BigDecimal("1.06"));
                stock.setVolume(42000000L);
                break;
            default:
                stock.setCompanyName("Unknown Company");
                stock.setCurrentPrice(new BigDecimal("100.00"));
                stock.setPreviousClose(new BigDecimal("100.00"));
                stock.setChangePercent(new BigDecimal("0.00"));
                stock.setVolume(0L);
        }
        
        return stock;
    }
}
