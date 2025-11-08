package com.example.repository;

import com.example.model.Item;

import java.util.List;

public interface ItemRepository {
    List<Item> findAll();
}