import React, { useContext } from "react";

type filterContextType = {
  minPrice: number | null;
  setMinPrice: (minPrice: number | null) => void;
  maxPrice: number | null;
  setMaxPrice: (maxPrice: number | null) => void;
  category: string | null;
  setCategory: (category: string | null) => void;
};

const filterContext = React.createContext<filterContextType | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [minPrice, setMinPrice] = React.useState<number | null>(null);
  const [maxPrice, setMaxPrice] = React.useState<number | null>(null);
  const [category, setCategory] = React.useState<string | null>(null);

  return (
    <filterContext.Provider
      value={{
        minPrice,
        setMinPrice,
        maxPrice,
        setMaxPrice,
        category,
        setCategory,
      }}
    >
      {children}
    </filterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(filterContext);
  if (!context) {
    throw new Error("useFilter() must be used inside filter provider");
  }
  return context;
}
