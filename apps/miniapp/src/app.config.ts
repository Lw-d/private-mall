export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/category/index',
    'pages/product/detail',
    'pages/cart/index',
    'pages/order/confirm',
    'pages/order/list',
    'pages/order/detail',
    'pages/after-sale/apply',
    'pages/after-sale/detail',
    'pages/coupon/index',
    'pages/address/index',
    'pages/user/index',
  ],
  window: {
    backgroundColor: '#f6f7f9',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '私域商城',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    color: '#667085',
    selectedColor: '#0f766e',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
      },
      {
        pagePath: 'pages/category/index',
        text: '分类',
      },
      {
        pagePath: 'pages/cart/index',
        text: '购物车',
      },
      {
        pagePath: 'pages/user/index',
        text: '我的',
      },
    ],
  },
});
