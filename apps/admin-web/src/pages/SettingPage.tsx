import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

import {
  fetchAdminPointRedeemRules,
  fetchHomeBanners,
  fetchProducts,
  resetAdminPointRedeemRules,
  updateAdminPointRedeemRules,
  updateHomeBanners,
} from '../api/adminApi';
import { showApiError } from '../api/error';
import { HomeBanner, PointRedeemRules, Product } from '../api/types';
import { appMessage } from '../utils/appMessage';

interface PointRuleFormValues {
  enabled: boolean;
  pointsPerYuan: number;
}

export function SettingPage() {
  const [pointRules, setPointRules] = useState<PointRedeemRules>();
  const [loading, setLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingBanners, setSavingBanners] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [bannerProducts, setBannerProducts] = useState<Product[]>([]);
  const [homeBanners, setHomeBanners] = useState<HomeBanner[]>([]);
  const [selectedBannerProductIds, setSelectedBannerProductIds] = useState<string[]>([]);
  const [form] = Form.useForm<PointRuleFormValues>();

  const load = async () => {
    setLoading(true);
    try {
      const rules = await fetchAdminPointRedeemRules();
      setPointRules(rules);
      form.setFieldsValue({
        enabled: rules.enabled,
        pointsPerYuan: rules.pointsPerYuan,
      });
    } catch (error) {
      showApiError(error, '运营设置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadHomeBanners();
  }, []);

  const loadHomeBanners = async () => {
    setBannerLoading(true);
    try {
      const [products, banners] = await Promise.all([
        fetchProducts({ status: 'ON_SALE' }),
        fetchHomeBanners(),
      ]);

      setBannerProducts(products);
      setHomeBanners(banners);
      setSelectedBannerProductIds(banners.map((banner) => banner.productId));
    } catch (error) {
      showApiError(error, '首页轮播配置加载失败');
    } finally {
      setBannerLoading(false);
    }
  };

  const submit = async () => {
    const values = await form.validateFields();

    setSaving(true);
    try {
      const rules = await updateAdminPointRedeemRules(values);
      setPointRules(rules);
      form.setFieldsValue({
        enabled: rules.enabled,
        pointsPerYuan: rules.pointsPerYuan,
      });
      appMessage.success('积分规则已保存');
    } catch (error) {
      showApiError(error, '积分规则保存失败');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      const rules = await resetAdminPointRedeemRules();
      setPointRules(rules);
      form.setFieldsValue({
        enabled: rules.enabled,
        pointsPerYuan: rules.pointsPerYuan,
      });
      appMessage.success('已恢复环境变量规则');
    } catch (error) {
      showApiError(error, '积分规则恢复失败');
    } finally {
      setResetting(false);
    }
  };

  const submitHomeBanners = async () => {
    setSavingBanners(true);
    try {
      const banners = await updateHomeBanners({
        items: selectedBannerProductIds.map((productId, index) => ({
          productId,
          sort: index,
          isActive: true,
        })),
      });

      setHomeBanners(banners);
      setSelectedBannerProductIds(banners.map((banner) => banner.productId));
      appMessage.success('首页轮播商品已保存');
    } catch (error) {
      showApiError(error, '首页轮播商品保存失败');
    } finally {
      setSavingBanners(false);
    }
  };

  return (
    <section className="page">
      <Space direction="vertical" size={16} className="full-width">
        <Alert
          type="info"
          showIcon
          message="保存后立即影响新订单"
          description="已创建订单会保留自身积分抵扣快照，不会被后续规则调整改写。"
        />

        <Card title="积分抵扣规则" loading={loading}>
          <Space direction="vertical" size={16} className="full-width">
            <Form form={form} layout="vertical">
              <Form.Item label="启用积分抵扣" name="enabled" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item
                label="抵扣比例"
                name="pointsPerYuan"
                rules={[
                  { required: true, message: '请输入积分抵扣比例' },
                  { type: 'number', min: 1, message: '抵扣比例不能小于 1' },
                ]}
              >
                <InputNumber
                  min={1}
                  precision={0}
                  addonAfter="积分 / 1 元"
                  className="full-width"
                />
              </Form.Item>
              <Space>
                <Button type="primary" loading={saving} onClick={() => void submit()}>
                  保存
                </Button>
                <Button loading={resetting} onClick={() => void reset()}>
                  恢复环境变量
                </Button>
              </Space>
            </Form>
            <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered>
              <Descriptions.Item label="状态">
                {pointRules?.enabled === false ? '停用' : '启用'}
              </Descriptions.Item>
              <Descriptions.Item label="当前比例">
                {pointRules?.pointsPerYuan ?? 100} 积分 / 1 元
              </Descriptions.Item>
              <Descriptions.Item label="配置来源">
                {pointRules?.source === 'database' ? '后台配置' : '环境变量'}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {pointRules?.updatedAt ? new Date(pointRules.updatedAt).toLocaleString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="小程序同步">
                订单确认页通过 /api/points/rules 读取
              </Descriptions.Item>
            </Descriptions>
          </Space>
        </Card>

        <Card title="首页轮播商品" loading={bannerLoading}>
          <Space direction="vertical" size={16} className="full-width">
            <Select
              mode="multiple"
              allowClear
              className="full-width"
              placeholder="选择小程序首页轮播展示的商品"
              value={selectedBannerProductIds}
              options={bannerProducts.map((product) => ({
                value: product.id,
                label: product.name,
              }))}
              onChange={setSelectedBannerProductIds}
            />
            <Typography.Text type="secondary">
              小程序按选择顺序展示轮播图，最多保存 10 个商品。
            </Typography.Text>
            <Space>
              <Button type="primary" loading={savingBanners} onClick={() => void submitHomeBanners()}>
                保存轮播商品
              </Button>
              <Button onClick={() => void loadHomeBanners()}>重新加载</Button>
            </Space>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="当前配置">
                {homeBanners.length > 0
                  ? homeBanners.map((banner) => banner.product.name).join('、')
                  : '未配置'}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        </Card>
      </Space>
    </section>
  );
}
