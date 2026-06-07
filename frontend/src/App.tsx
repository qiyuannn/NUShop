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
import React from "react";
import { useCartStore } from "./context/cartStore";
import { useAuthApiFetch } from "./hooks/use-authApiFetch";
import { useAuth } from "./context/auth";
import { toast } from "sonner";
import { CartPage } from "./pages/cart";

export function App() {
  const initCart = useCartStore((state) => state.initCart);
  const authApiFetch = useAuthApiFetch();
  const { token } = useAuth();

  React.useEffect(() => {
    if (!token) {
      return;
    }

    async function initcart() {
      try {
        await initCart(authApiFetch);
      } catch (error) {
        if (error instanceof Error) {
          toast.error("Failed to initialise cart");
        }
      }
    }

    initcart();
  }, [token]);

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
        <Route path="/user/:userID" element={<ProfilePage />} />
        <Route path="/cart" element={<CartPage/>}/>

        <Route path="/test" element={<CartPage/>} />
      </Route>
    </Routes>
  );
}

export default App;
