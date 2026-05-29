import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/login";
import { SignupPage } from "./pages/signup";
import Main from "./pages/main";
import { CreateListingPage } from "./pages/createListing";
import { ListingPage } from "./pages/listing";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={false ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<Main />} />
      <Route path="/listing/:listingID" element={<ListingPage />} />
      <Route path="/create" element={<CreateListingPage />} />
    </Routes>
  );
}

export default App;
