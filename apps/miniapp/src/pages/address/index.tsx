import { Button, Input, Switch, Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useState } from 'react';

import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from '../../api/addressApi';
import { showApiError } from '../../api/error';
import { AddressInput, UserAddress } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { useSessionStore } from '../../store/sessionStore';
import { ORDER_ADDRESS_SELECTED_EVENT } from '../order/events';
import './index.css';

interface AddressFormValues {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  postalCode: string;
  isDefault: boolean;
}

const emptyForm: AddressFormValues = {
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  postalCode: '',
  isDefault: true,
};

function toForm(address: UserAddress): AddressFormValues {
  return {
    receiverName: address.receiverName,
    receiverPhone: address.receiverPhone,
    province: address.province,
    city: address.city,
    district: address.district,
    detailAddress: address.detailAddress,
    postalCode: address.postalCode ?? '',
    isDefault: address.isDefault,
  };
}

function toInput(form: AddressFormValues): AddressInput {
  return {
    receiverName: form.receiverName.trim(),
    receiverPhone: form.receiverPhone.trim(),
    province: form.province.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    detailAddress: form.detailAddress.trim(),
    postalCode: form.postalCode.trim() || undefined,
    isDefault: form.isDefault,
  };
}

function formatAddress(address: UserAddress) {
  return `${address.province}${address.city}${address.district}${address.detailAddress}`;
}

export default function AddressPage() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [form, setForm] = useState<AddressFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string>();
  const selectMode = router.params.select === '1';
  const selectedAddressId = router.params.selectedAddressId;

  const load = async () => {
    if (!accessToken) {
      setAddresses([]);
      return;
    }

    setLoading(true);
    try {
      setAddresses(await fetchAddresses());
    } catch (error) {
      showApiError(error, '地址加载失败');
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void load();
  });

  const updateField = <K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(undefined);
    setForm({ ...emptyForm, isDefault: addresses.length === 0 });
  };

  const editAddress = (address: UserAddress) => {
    setEditingId(address.id);
    setForm(toForm(address));
  };

  const submit = async () => {
    const input = toInput(form);

    if (
      !input.receiverName ||
      !input.receiverPhone ||
      !input.province ||
      !input.city ||
      !input.district ||
      !input.detailAddress
    ) {
      void Taro.showToast({ title: '请填写完整地址', icon: 'none' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateAddress(editingId, input);
        void Taro.showToast({ title: '地址已更新', icon: 'success' });
      } else {
        await createAddress(input);
        void Taro.showToast({ title: '地址已新增', icon: 'success' });
      }

      resetForm();
      await load();
    } catch (error) {
      showApiError(error, '地址保存失败');
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (address: UserAddress) => {
    setProcessingId(address.id);
    try {
      await setDefaultAddress(address.id);
      void Taro.showToast({ title: '已设为默认', icon: 'success' });
      await load();
    } catch (error) {
      showApiError(error, '设置默认失败');
    } finally {
      setProcessingId(undefined);
    }
  };

  const removeAddress = async (address: UserAddress) => {
    const result = await Taro.showModal({
      title: '删除地址',
      content: `确认删除 ${address.receiverName} 的收货地址？`,
      confirmText: '删除',
      confirmColor: '#dc2626',
    });

    if (!result.confirm) {
      return;
    }

    setProcessingId(address.id);
    try {
      await deleteAddress(address.id);
      void Taro.showToast({ title: '地址已删除', icon: 'success' });
      if (editingId === address.id) {
        resetForm();
      }
      await load();
    } catch (error) {
      showApiError(error, '删除地址失败');
    } finally {
      setProcessingId(undefined);
    }
  };

  const chooseAddress = (address: UserAddress) => {
    Taro.eventCenter.trigger(ORDER_ADDRESS_SELECTED_EVENT, { addressId: address.id });
    void Taro.navigateBack();
  };

  if (!accessToken) {
    return (
      <PageShell>
        <View className="address-empty">
          <Text className="address-empty-title">请先登录</Text>
          <Text className="address-empty-copy">登录后可以管理收货地址。</Text>
          <Button
            className="address-primary-button"
            onClick={() => Taro.switchTab({ url: '/pages/user/index' })}
          >
            去登录
          </Button>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <View className="address-page">
        <View className="address-section">
          <View className="address-section-header">
            <Text className="address-section-title">{selectMode ? '选择地址' : '地址列表'}</Text>
            <Button
              className="address-refresh-button"
              loading={loading}
              onClick={() => void load()}
            >
              刷新
            </Button>
          </View>

          {loading && addresses.length === 0 ? (
            <View className="address-placeholder">
              <Text>正在加载地址</Text>
            </View>
          ) : addresses.length > 0 ? (
            <View className="address-list">
              {addresses.map((address) => {
                const selected = address.id === selectedAddressId;

                return (
                  <View
                    className={selected ? 'address-card selected' : 'address-card'}
                    key={address.id}
                  >
                    <View className="address-card-head">
                      <Text className="address-name">{address.receiverName}</Text>
                      <Text className="address-phone">{address.receiverPhone}</Text>
                      {address.isDefault ? <Text className="address-badge">默认</Text> : null}
                      {selected ? <Text className="address-badge selected">已选</Text> : null}
                    </View>
                    <Text className="address-line">{formatAddress(address)}</Text>
                    <View className="address-actions">
                      {selectMode ? (
                        <Button
                          className="address-action-button primary"
                          onClick={() => chooseAddress(address)}
                        >
                          选择
                        </Button>
                      ) : null}
                      <Button
                        className="address-action-button"
                        onClick={() => editAddress(address)}
                      >
                        编辑
                      </Button>
                      <Button
                        className="address-action-button"
                        disabled={address.isDefault || processingId === address.id}
                        loading={processingId === address.id && !address.isDefault}
                        onClick={() => void makeDefault(address)}
                      >
                        设默认
                      </Button>
                      <Button
                        className="address-action-button danger"
                        disabled={address.isDefault || processingId === address.id}
                        loading={processingId === address.id && !address.isDefault}
                        onClick={() => void removeAddress(address)}
                      >
                        删除
                      </Button>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="address-placeholder">
              <Text>还没有收货地址</Text>
            </View>
          )}
        </View>

        <View className="address-section">
          <View className="address-section-header">
            <Text className="address-section-title">{editingId ? '编辑地址' : '新增地址'}</Text>
            {editingId ? (
              <Button className="address-refresh-button" onClick={resetForm}>
                取消
              </Button>
            ) : null}
          </View>

          <View className="address-form">
            <Input
              className="address-input"
              maxlength={32}
              placeholder="收货人"
              value={form.receiverName}
              onInput={(event) => updateField('receiverName', event.detail.value)}
            />
            <Input
              className="address-input"
              maxlength={32}
              placeholder="联系电话"
              type="number"
              value={form.receiverPhone}
              onInput={(event) => updateField('receiverPhone', event.detail.value)}
            />
            <View className="address-grid">
              <Input
                className="address-input"
                maxlength={32}
                placeholder="省"
                value={form.province}
                onInput={(event) => updateField('province', event.detail.value)}
              />
              <Input
                className="address-input"
                maxlength={32}
                placeholder="市"
                value={form.city}
                onInput={(event) => updateField('city', event.detail.value)}
              />
              <Input
                className="address-input"
                maxlength={32}
                placeholder="区/县"
                value={form.district}
                onInput={(event) => updateField('district', event.detail.value)}
              />
            </View>
            <Input
              className="address-input"
              maxlength={120}
              placeholder="详细地址"
              value={form.detailAddress}
              onInput={(event) => updateField('detailAddress', event.detail.value)}
            />
            <Input
              className="address-input"
              maxlength={16}
              placeholder="邮编（选填）"
              value={form.postalCode}
              onInput={(event) => updateField('postalCode', event.detail.value)}
            />
            <View className="address-default-row">
              <View>
                <Text className="address-default-title">设为默认地址</Text>
                <Text className="address-default-copy">订单确认页会优先使用默认地址</Text>
              </View>
              <Switch
                checked={form.isDefault}
                color="#0f766e"
                onChange={(event) => updateField('isDefault', event.detail.value)}
              />
            </View>
            <Button className="address-save-button" loading={saving} onClick={() => void submit()}>
              {editingId ? '保存修改' : '新增地址'}
            </Button>
          </View>
        </View>
      </View>
    </PageShell>
  );
}
