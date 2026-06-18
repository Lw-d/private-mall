import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  InputNumber,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

import {
  fetchAdminPointRedeemRules,
  resetAdminPointRedeemRules,
  updateAdminPointRedeemRules,
} from '../api/adminApi';
import { showApiError } from '../api/error';
import { PointRedeemRules } from '../api/types';

interface PointRuleFormValues {
  enabled: boolean;
  pointsPerYuan: number;
}

export function SettingPage() {
  const [pointRules, setPointRules] = useState<PointRedeemRules>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
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
  }, []);

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
      message.success('积分规则已保存');
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
      message.success('已恢复环境变量规则');
    } catch (error) {
      showApiError(error, '积分规则恢复失败');
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="page">
      <div className="page-title">
        <Typography.Title level={4}>运营设置</Typography.Title>
        <Typography.Text type="secondary">配置当前积分抵扣规则和运营参数来源。</Typography.Text>
      </div>

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
      </Space>
    </section>
  );
}
