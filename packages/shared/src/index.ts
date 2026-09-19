export const BRAND = {
  name: 'Burkina Market',
  country: 'Burkina Faso',
  currency: 'XOF',
} as const;

export type DeliveryPolicy = 'SELLER_DELIVERS' | 'NO_DELIVERY' | 'LIMITED_ZONES';
export type OrderStatus = 'CREATED' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED' | 'REFUNDED';
