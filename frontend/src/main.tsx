import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import LoginPage from "./pages/login"
import SignUpPage from "./pages/createAcc"



createRoot(document.getElementById("root")!).render(
  <StrictMode>
      <ThemeProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage/>}/>
          <Route path="/signup" element={<SignUpPage/>}/>
        </Routes>
        </BrowserRouter>
      </ThemeProvider>
  </StrictMode>
)
