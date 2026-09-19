import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Aisle, Category, Card as PaymentCard, House, Timing } from "@/lib/types";

/** Configurable lists live in Mongo now — these hooks are the single source of truth. */

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => apiGet<Category[]>("/categories") });
}

export function useAisles() {
  return useQuery({ queryKey: ["aisles"], queryFn: () => apiGet<Aisle[]>("/aisles") });
}

export function useTimings() {
  return useQuery({ queryKey: ["timings"], queryFn: () => apiGet<Timing[]>("/timings") });
}

export function useHouses() {
  return useQuery({ queryKey: ["houses"], queryFn: () => apiGet<House[]>("/houses") });
}

export function useCards() {
  return useQuery({ queryKey: ["cards"], queryFn: () => apiGet<PaymentCard[]>("/cards") });
}
