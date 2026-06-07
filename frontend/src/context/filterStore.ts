import { create } from "zustand";

type FilterStore = {
  minPrice: string;
  setMinPrice: (minPrice: string) => void;
  maxPrice: string;
  setMaxPrice: (maxPrice: string) => void;
  condition: string[];
  setCondition: (value: string[] | ((prev: string[]) => string[])) => void;
};

export const useFilterStore = create<FilterStore>((set) => ({
  minPrice: "",
  setMinPrice: (val) => {
    set({ minPrice: val });
  },
  maxPrice: "",
  setMaxPrice: (val) => {
    set({ maxPrice: val });
  },
  condition: [],
  setCondition: (val) => {
    set((state) => ({
      condition: typeof val == "function" ? val(state.condition) : val,
    }));
  },
}));
