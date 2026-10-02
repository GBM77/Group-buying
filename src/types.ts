export interface OrderEntry {
  id: string;
  buyer: string;
  item: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  createdAt: number;
  isPaid: boolean;
  isDelivered: boolean;
  paidAmount?: number;
  paymentMethod?: string;
  paymentNote?: string;
  paidAt?: number;
}

export interface AppSettings {
  backgroundColor: string;
  accentColor: string;
  menuImageUrl?: string;
  accentImageUrl?: string;
  paymentAccountInfo?: string; // 匯款帳號/收款說明，用於催繳單
}

export interface ItemSummary {
  itemName: string;
  totalQuantity: number;
  totalAmount: number;
  buyers: {
    buyerName: string;
    quantity: number;
    amount: number;
  }[];
}

export interface BuyerSummary {
  buyerName: string;
  totalAmount: number;
  items: {
    itemName: string;
    quantity: number;
    price: number;
    amount: number;
  }[];
}
