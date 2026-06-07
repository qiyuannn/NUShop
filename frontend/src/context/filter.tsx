import React, { useContext } from "react";

type filterContextType = {
  minPrice: string;
  setMinPrice: React.Dispatch<React.SetStateAction<string>>;
  maxPrice: string;
  setMaxPrice: React.Dispatch<React.SetStateAction<string>>;
  condition: string[];
  setCondition: React.Dispatch<React.SetStateAction<string[]>>;
};

const filterContext = React.createContext<filterContextType | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [condition, setCondition] = React.useState<string[]>([]);
  const [minPrice, setMinPrice] = React.useState<string>("");
  const [maxPrice, setMaxPrice] = React.useState<string>("");

  return (
    <filterContext.Provider
      value={{
        minPrice,
        setMinPrice,
        maxPrice,
        setMaxPrice,
        condition,
        setCondition,
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
