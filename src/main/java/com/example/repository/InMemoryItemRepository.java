package com.example.repository;

import com.example.model.Item;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Repository
public class InMemoryItemRepository implements ItemRepository {

    private final List<Item> items = new ArrayList<>();

    public InMemoryItemRepository() {
        // Sample data
        items.add(new Item(1L, "Ябълка", new BigDecimal("1.20")));
        items.add(new Item(2L, "Банан", new BigDecimal("2.50")));
        items.add(new Item(3L, "Портокал", new BigDecimal("1.80")));
    }

    @Override
    public List<Item> findAll() {
        return Collections.unmodifiableList(items);
    }
}
