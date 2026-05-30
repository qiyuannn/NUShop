import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/login";
import { SignupPage } from "./pages/signup";
import Main from "./pages/homepage";
import { CreateListingPage } from "./pages/createListing";
import { ListingPage } from "./pages/listing";
import { Filters } from "./components/filters";
import { UserListingsPage } from "./pages/userListings";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={false ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<Main />} />
      <Route path="/listing/:listingID" element={<ListingPage />} />
      <Route path="/create" element={<CreateListingPage />} />
      <Route path="/userListings" element={<UserListingsPage />} />
      <Route path="/test" element={<Filters/>}/>
    </Routes>
  );
}

export default App;
