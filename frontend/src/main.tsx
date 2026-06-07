import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { BrowserRouter } from "react-router-dom";
import { SidebarProvider } from "./components/ui/sidebar.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { AuthProvider } from "./context/auth.tsx";
import { FilterProvider } from "./context/filter.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <SidebarProvider defaultOpen={false}>
        <AuthProvider>
          <FilterProvider>
            <TooltipProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </TooltipProvider>
          </FilterProvider>
        </AuthProvider>
      </SidebarProvider>
    </ThemeProvider>
  </StrictMode>,
);
