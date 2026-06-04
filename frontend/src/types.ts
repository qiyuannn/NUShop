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
