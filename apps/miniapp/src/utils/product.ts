import { Product } from '../api/types';
import { resolveAssetUrl } from '../lib/request';

export function getProductCover(product: Product) {
  const mainImage = product.images.find((image) => image.isMain) ?? product.images[0];
  return resolveAssetUrl(mainImage?.url);
}

export function getProductPrice(product: Product) {
  const activeSkus = product.skus.filter((sku) => sku.isActive);
  const prices = (activeSkus.length > 0 ? activeSkus : product.skus).map((sku) =>
    Number(sku.price),
  );
  const minPrice = Math.min(...prices);

  return Number.isFinite(minPrice) ? minPrice.toFixed(2) : '--';
}

export function getProductStock(product: Product) {
  return product.skus.reduce((sum, sku) => sum + sku.stock, 0);
}
