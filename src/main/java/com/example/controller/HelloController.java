package com.example.controller;

import com.example.model.Stock;
import com.example.service.ItemService;
import com.example.service.StockService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

@Controller
public class HelloController {

    private final ItemService itemService;
    private final StockService stockService;

    public HelloController(ItemService itemService, StockService stockService) {
        this.itemService = itemService;
        this.stockService = stockService;
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("title", "Следене на акции");
        model.addAttribute("stocks", stockService.getWatchlistStocks());
        return "index"; // resolves to src/main/resources/templates/index.html
    }

    @GetMapping("/api/stocks")
    @ResponseBody
    public List<Stock> getStocks() {
        return stockService.getWatchlistStocks();
    }
}
