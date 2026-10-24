import { Order } from '../models/Order.model';
import { Product } from '../models/Product.model';

export const restoreOrderStock = async (orderId: string): Promise<void> => {
  const order = await Order.findById(orderId);

  if (!order) {
    return;
  }

  for (const item of order.items) {
    const product = await Product.findById(item.product);

    if (!product) {
      continue;
    }

    if (item.sku) {
      const variant = product.variants.find((candidate) => candidate.sku === item.sku);
      if (variant) {
        variant.stock += item.quantity;
      }
    } else {
      product.stock += item.quantity;
    }

    await product.save();
  }
};
