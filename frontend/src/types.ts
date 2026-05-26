export type User = {
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  createdOn: string;
};

export type Listing = {
  uuid: string;
  sellerUUID: string;
  title: string;
  description: string;
  Price: number;
  quantity: number;
  categoryUUID: string;
  createdOn: string;
  images: string[];
};

export type Category = {
  uuid: string;
  name: string;
};
