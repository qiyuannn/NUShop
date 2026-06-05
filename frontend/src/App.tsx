import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/login";
import { SignupPage } from "./pages/signup";
import { Layout } from "./components/layout";
import { EditListingPage } from "./pages/editListing";
import { HomePage } from "./pages/home";
import { ManageListing } from "./pages/manageListing";
import { CreateListingPage } from "./pages/createListing";
import { Listing } from "./pages/listingItem";
import { ProfilePage } from "./pages/profile";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={false ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/listings/:listingID/edit" element={<EditListingPage />} />
        <Route path="/listings/create" element={<CreateListingPage />} />
        <Route path="/listings/manage" element={<ManageListing />} />
        <Route path="/listing/:listingID" element={<Listing />} />
        <Route path="/user/:userID" element={<ProfilePage/>}/>

        <Route path="/test/:listingID" element={<Listing />} />
      </Route>
    </Routes>
  );
}

export default App;
