import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/login";
import { SignupPage } from "./pages/signup";
import Main from "./pages/main";
import { CreateListingForm, CreateListingPage } from "./pages/createListing";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={false ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<Main />} />
      <Route path="/listing/:listingID" element={<CreateListingForm />} />
      <Route path="/create" element={<CreateListingPage />} />
    </Routes>
  );
}

export default App;
