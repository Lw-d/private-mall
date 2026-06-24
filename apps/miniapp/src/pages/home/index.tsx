import { Button, Image, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { fetchHomeBanners, fetchProducts } from '../../api/catalogApi';
import { showApiError } from '../../api/error';
import { HomeBanner, Product } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { ProductCard } from '../../components/ProductCard';
import { getProductCover, getProductPrice } from '../../utils/product';
import './index.css';

export default function HomePage() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadBanners = async () => {
    setLoadingBanners(true);
    try {
      setBanners(await fetchHomeBanners());
    } catch (error) {
      showApiError(error, '首页轮播加载失败');
    } finally {
      setLoadingBanners(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      setProducts(await fetchProducts());
    } catch (error) {
      showApiError(error, '商品加载失败');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    void loadBanners();
    void loadProducts();
  }, []);

  const openProduct = (id: string) => {
    void Taro.navigateTo({ url: `/pages/product/detail?id=${id}` });
  };

  return (
    <PageShell className="home-page">
      {loadingBanners ? (
        <View className="state-panel">
          <Text className="state-title">正在加载轮播</Text>
        </View>
      ) : banners.length > 0 ? (
        <Swiper
          className="home-banner-swiper"
          autoplay
          circular
          indicatorActiveColor="#0f766e"
          indicatorColor="rgba(15, 118, 110, 0.24)"
          indicatorDots={banners.length > 1}
        >
          {banners.map((banner) => {
            const product = banner.product;
            const cover = getProductCover(product);
            const price = getProductPrice(product);

            return (
              <SwiperItem key={banner.id}>
                <View className="home-banner" onClick={() => openProduct(product.id)}>
                  {cover ? (
                    <Image className="home-banner-image" mode="aspectFill" src={cover} />
                  ) : (
                    <View className="home-banner-placeholder">
                      <Text>商品</Text>
                    </View>
                  )}
                  <View className="home-banner-mask">
                    <Text className="home-banner-tag">{product.category?.name ?? '精选商品'}</Text>
                    <Text className="home-banner-title">{product.name}</Text>
                    <Text className="home-banner-copy">{product.subtitle ?? '点击查看商品详情'}</Text>
                    <Text className="home-banner-price">¥ {price}</Text>
                  </View>
                </View>
              </SwiperItem>
            );
          })}
        </Swiper>
      ) : (
        <View className="state-panel">
          <Text className="state-title">暂无轮播商品</Text>
          <Text className="state-copy">请先在后台运营设置中配置首页轮播商品。</Text>
          <Button className="state-button" onClick={() => void loadBanners()}>
            重新加载
          </Button>
        </View>
      )}

      <ScrollView className="home-product-scroll" scrollY>
        {loadingProducts ? (
          <View className="state-panel">
            <Text className="state-title">正在加载商品</Text>
          </View>
        ) : products.length > 0 ? (
          <View className="product-grid">
            {products.map((product) => (
              <ProductCard showQuickCart product={product} key={product.id} />
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
      </ScrollView>
    </PageShell>
  );
}
