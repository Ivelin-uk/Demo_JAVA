package com.example.controller;

import com.example.service.ItemService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HelloController {

    private final ItemService itemService;

    public HelloController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("title", "Hello");
        model.addAttribute("items", itemService.getAllItems());
        return "index"; // resolves to src/main/resources/templates/index.html
    }
}
