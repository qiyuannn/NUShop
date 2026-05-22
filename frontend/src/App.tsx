import { Route, Routes } from "react-router-dom"
import { LoginPage } from "./components/pages/login"
import { SignupPage } from "./components/pages/signup"


export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/signup" element={<SignupPage/>}/>
    </Routes>
  )
}

export default App
