import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { fetchProducts } from '../../api/catalogApi';
import { showApiError } from '../../api/error';
import { Product } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { ProductCard } from '../../components/ProductCard';
import './index.css';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      setProducts(await fetchProducts());
    } catch (error) {
      showApiError(error, '商品加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const openProduct = (id: string) => {
    void Taro.navigateTo({ url: `/pages/product/detail?id=${id}` });
  };

  const openFirstProduct = () => {
    const firstProduct = products[0];
    if (firstProduct) {
      openProduct(firstProduct.id);
      return;
    }

    void Taro.switchTab({ url: '/pages/category/index' });
  };

  return (
    <PageShell>
      <View className="home-hero">
        <View>
          <Text className="hero-kicker">PRIVATE MALL</Text>
          <Text className="hero-title">精选商品，会员优先</Text>
          <Text className="hero-copy">跑通登录、商品、购物车、订单和支付的首版小程序入口。</Text>
        </View>
        <Button className="hero-button" onClick={openFirstProduct}>
          查看商品
        </Button>
      </View>

      <View className="section-heading">
        <Text className="section-title">推荐商品</Text>
        <Text
          className="section-link"
          onClick={() => Taro.switchTab({ url: '/pages/category/index' })}
        >
          全部
        </Text>
      </View>

      {loading ? (
        <View className="state-panel">
          <Text className="state-title">正在加载商品</Text>
        </View>
      ) : products.length > 0 ? (
        <View className="product-grid">
          {products.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </View>
      ) : (
        <View className="state-panel">
          <Text className="state-title">暂无上架商品</Text>
          <Text className="state-copy">请先在后台创建并上架商品。</Text>
          <Button className="state-button" onClick={() => void loadProducts()}>
            重新加载
          </Button>
        </View>
      )}
    </PageShell>
  );
}
