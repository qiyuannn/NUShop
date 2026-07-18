export type User = {
  id: string;
  username: string;
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

export type WSMessage = {
  type: string;
  message?: Message;
  read?: Read;
};

export type Message = {
  id: string;
  senderID: string;
  receiverID: string;
  listingID: string;
  content: string;
  createdOn: string;
};

export type Read = {
  userID: string;
  otherID: string;
  listingID: string;
  lastReadID: string;
};

export type chat = {
  listingID: string;
  title: string;
  content: string;
  createdOn: string;
  otherName: string;
  otherID: string;
  image: string;
  unreadCount: number;
};
