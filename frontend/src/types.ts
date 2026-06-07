export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdOn: string;
};

export type Listing = {
  id: string;
  sellerID: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  categoryName: string;
  createdOn: string;
  images: string[];
};

export type CartItem = {
  listing: Listing;
  quantity: number;
};

export type AuthApiFetch = (url: string, options?: RequestInit) => Promise<Response>;
