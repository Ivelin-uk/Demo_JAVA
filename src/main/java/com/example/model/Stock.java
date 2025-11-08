package com.example.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class Stock {
    private String symbol;
    private String companyName;
    private BigDecimal currentPrice;
    private BigDecimal previousClose;
    private BigDecimal changePercent;
    private Long volume;
    private LocalDateTime lastUpdated;

    public Stock() {
    }

    public Stock(String symbol, String companyName, BigDecimal currentPrice, 
                 BigDecimal previousClose, BigDecimal changePercent, Long volume) {
        this.symbol = symbol;
        this.companyName = companyName;
        this.currentPrice = currentPrice;
        this.previousClose = previousClose;
        this.changePercent = changePercent;
        this.volume = volume;
        this.lastUpdated = LocalDateTime.now();
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }

    public BigDecimal getPreviousClose() {
        return previousClose;
    }

    public void setPreviousClose(BigDecimal previousClose) {
        this.previousClose = previousClose;
    }

    public BigDecimal getChangePercent() {
        return changePercent;
    }

    public void setChangePercent(BigDecimal changePercent) {
        this.changePercent = changePercent;
    }

    public Long getVolume() {
        return volume;
    }

    public void setVolume(Long volume) {
        this.volume = volume;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
