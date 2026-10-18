import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/context/cartStore";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { API_URL } from "@/lib/api";
import type { Listing } from "@/types";
import { Trash } from "lucide-react";
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function CartPage() {
  const cartItems = useCartStore((state) => state.cartItems);
  const authApiFetch = useAuthApiFetch();
  const [searchParams] = useSearchParams();
  const [total, setTotal] = React.useState(0);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);

  const paymentStatus = searchParams.get("payment");

  const handleCheckout = async () => {
    setCheckoutError(null);

    if (cartItems.size === 0) {
      setCheckoutError("Your cart is empty.");
      return;
    }

    try {
      setCheckoutLoading(true);

      const res = await authApiFetch(`${API_URL}/payments/stripe/checkout`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Failed to start Stripe checkout");
      }

      if (!json?.data?.url) {
        throw new Error("Stripe did not return a checkout URL");
      }

      window.location.assign(json.data.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Failed to start Stripe checkout",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  React.useEffect(() => {
    var total = 0;
    for (const cartItem of cartItems.values()) {
      total += cartItem.listing.price * cartItem.quantity;
    }
    setTotal(total);
  }, [cartItems]);

  return (
    <div>
      <Item>
        <ItemContent>
          <ItemHeader className="text-2xl font-bold">Shopping cart</ItemHeader>
          <ItemDescription className="text-muted-foreground">
            {cartItems.size} items
          </ItemDescription>
        </ItemContent>
      </Item>
      <div className="sm:pl-16 sm:pr-16">
        <CartList />
        <Separator />
        <div className="flex flex-col gap-3 pt-2">
          {paymentStatus === "success" && (
            <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">
              Payment completed. Please wait for the seller to ship your items.
            </p>
          )}

          {paymentStatus === "canceled" && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
              Checkout was canceled.
            </p>
          )}

          {checkoutError && <p className="text-sm text-red-500">{checkoutError}</p>}

          <div className="flex flex-rows items-center gap-5 justify-end">
            <p>Total: ${total}</p>
            <Button
              className="rounded-none"
              size="lg"
              onClick={handleCheckout}
              disabled={checkoutLoading || cartItems.size === 0}
            >
              {checkoutLoading ? "Redirecting..." : "Checkout"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartList() {
  const cartItems = useCartStore((state) => state.cartItems);
  return (
    <div>
      <Item className="flex">
        <div className="w-10" />
        <div className="flex-1 grid grid-cols-[1fr_50px_50px] sm:grid-cols-[1fr_100px_100px] gap-5">
          <ItemTitle>Item</ItemTitle>
          <ItemTitle>Quantity</ItemTitle>
          <ItemTitle>Subtotal</ItemTitle>
        </div>
        <div className="w-10" />
      </Item>
      <Separator />
      {cartItems.size == 0 ? (
        <EmptyCart />
      ) : (
        <div>
          {Array.from(cartItems.entries()).map(([id, cartItem]) => (
            <CartItemCard listing={cartItem.listing} quantity={cartItem.quantity} key={id} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CartItemCard({ listing, quantity }: { listing: Listing; quantity: number }) {
  const authApiFetch = useAuthApiFetch();
  const addToCart = useCartStore((state) => state.addToCart);
  const navigate = useNavigate();
  const deleteFromCart = useCartStore((state) => state.deleteFromCart);
  const [qty, setQty] = React.useState(quantity);
  const [err, setErr] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^[0-9]*$/.test(e.target.value)) {
      setQty(Number(e.target.value));
    }
  };

  const handleBlur = async () => {
    setErr(null);
    if (qty <= 0) {
      setErr("Must be at least 1");
      return;
    }
    try {
      await addToCart(authApiFetch, listing.id, qty, true);
    } catch {
      setErr("Failed to update quantity");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFromCart(authApiFetch, listing.id);
    } catch {
      setErr("Failed to delete from cart");
    }
  };

  React.useEffect(() => {
    setQty(quantity);
  }, [quantity]);

  return (
    <Item>
      <ItemMedia variant="image" onClick={() => navigate(`/listings/${listing.id}`)}>
        <img
          src={
            listing?.images?.[0]
              ? listing.images[0].startsWith("http")
                ? listing.images[0]
                : `${API_URL}${listing.images[0]}`
              : ""
          }
          className="aspect-square object-cover border rounded-sm"
        />
      </ItemMedia>
      <ItemContent className="grid grid-cols-[1fr_50px_50px] sm:grid-cols-[1fr_100px_100px] gap-5">
        <ItemTitle className="font-bold" onClick={() => navigate(`/listing/${listing.id}`)}>
          {listing.title}
        </ItemTitle>
        <div>
          <Input
            value={qty}
            onChange={handleChange}
            onBlur={handleBlur}
            type="number"
            aria-invalid={err !== null}
          />
          {err && <p className="text-xs pt-1">{err}</p>}
        </div>
        <ItemTitle>${Number(listing.price) * qty}</ItemTitle>
      </ItemContent>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="w-10 h-10" aria-label={`${listing.id} delete listing`}>
            <Trash />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm remove item from cart?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Item>
  );
}

function EmptyCart() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Cart empty</EmptyTitle>
        <EmptyDescription>
          You're all caught up. New items added to cart will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
