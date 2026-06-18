import { MinusCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { uploadImage } from '../api/adminApi';
import { showApiError } from '../api/error';
import { Category, Product, ProductInput, ProductStatus } from '../api/types';

interface ProductFormModalProps {
  categories: Category[];
  initialProduct?: Product;
  open: boolean;
  onCancel: () => void;
  onSubmit: (input: ProductInput) => Promise<void>;
}

interface ProductFormValues {
  categoryId: string;
  name: string;
  subtitle?: string;
  description?: string;
  status?: ProductStatus;
  sort?: number;
  mainImageUrl?: string;
  skus: Array<{
    name: string;
    skuCode?: string;
    specsText?: string;
    price: number;
    originPrice?: number;
    stock: number;
    isActive?: boolean;
  }>;
}

function flattenCategories(
  categories: Category[],
  prefix = '',
): { label: string; value: string }[] {
  return categories.flatMap((category) => {
    const label = `${prefix}${category.name}`;
    return [
      { label, value: category.id },
      ...flattenCategories(category.children ?? [], `${prefix}${category.name} / `),
    ];
  });
}

function parseSpecs(text?: string) {
  if (!text?.trim()) {
    return undefined;
  }

  try {
    const value = JSON.parse(text) as Record<string, string>;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('规格必须是 JSON 对象');
    }
    return value;
  } catch {
    throw new Error('规格 JSON 格式不正确');
  }
}

export function ProductFormModal({
  categories,
  initialProduct,
  open,
  onCancel,
  onSubmit,
}: ProductFormModalProps) {
  const [form] = Form.useForm<ProductFormValues>();
  const [uploading, setUploading] = useState(false);
  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialProduct) {
      form.setFieldsValue({
        categoryId: initialProduct.categoryId,
        name: initialProduct.name,
        subtitle: initialProduct.subtitle ?? undefined,
        description: initialProduct.description ?? undefined,
        status: initialProduct.status,
        sort: initialProduct.sort,
        mainImageUrl: initialProduct.images.find((image) => image.isMain)?.url,
        skus: initialProduct.skus.map((sku) => ({
          name: sku.name,
          skuCode: sku.skuCode ?? undefined,
          specsText: sku.specs ? JSON.stringify(sku.specs) : undefined,
          price: Number(sku.price),
          originPrice: sku.originPrice ? Number(sku.originPrice) : undefined,
          stock: sku.stock,
          isActive: sku.isActive,
        })),
      });
    } else {
      form.setFieldsValue({
        status: 'DRAFT',
        sort: 0,
        skus: [{ name: '默认规格', price: 0, stock: 0, isActive: true }],
      });
    }
  }, [form, initialProduct, open]);

  const handleImageUpload: UploadProps['customRequest'] = async (options) => {
    const file = options.file as File;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      form.setFieldValue('mainImageUrl', result.url);
      message.success('图片上传成功');
      options.onSuccess?.(result);
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('图片上传失败');
      showApiError(error, '图片上传失败');
      options.onError?.(uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        categoryId: values.categoryId,
        name: values.name,
        subtitle: values.subtitle,
        description: values.description,
        status: values.status,
        sort: values.sort,
        images: values.mainImageUrl
          ? [
              {
                url: values.mainImageUrl,
                isMain: true,
                sort: 0,
              },
            ]
          : undefined,
        skus: values.skus.map((sku) => ({
          name: sku.name,
          skuCode: sku.skuCode,
          specs: parseSpecs(sku.specsText),
          price: sku.price,
          originPrice: sku.originPrice,
          stock: sku.stock,
          isActive: sku.isActive ?? true,
        })),
      });
      form.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        showApiError(error, '商品表单提交失败');
      }
    }
  };

  return (
    <Modal
      title={initialProduct ? '编辑商品' : '新增商品'}
      open={open}
      width={760}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="product-form">
        <div className="form-grid">
          <Form.Item
            name="name"
            label="商品名称"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="categoryId"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select showSearch options={categoryOptions} optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'DRAFT', label: '草稿' },
                { value: 'ON_SALE', label: '上架' },
                { value: 'OFF_SALE', label: '下架' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} className="full-width" />
          </Form.Item>
        </div>
        <Form.Item name="subtitle" label="副标题">
          <Input />
        </Form.Item>
        <Form.Item label="主图 URL">
          <Space.Compact className="full-width">
            <Form.Item name="mainImageUrl" noStyle>
              <Input />
            </Form.Item>
            <Upload
              accept="image/jpeg,image/png,image/webp,image/gif"
              customRequest={handleImageUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                上传
              </Button>
            </Upload>
          </Space.Compact>
        </Form.Item>
        <Form.Item name="description" label="详情">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Typography.Title level={5}>SKU</Typography.Title>
        <Form.List name="skus">
          {(fields, { add, remove }) => (
            <Space direction="vertical" className="full-width" size={12}>
              {fields.map((field) => (
                <div className="sku-row" key={field.key}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'name']}
                    label="名称"
                    rules={[{ required: true, message: '请输入 SKU 名称' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'skuCode']} label="编码">
                    <Input />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'price']}
                    label="价格"
                    rules={[{ required: true, message: '请输入价格' }]}
                  >
                    <InputNumber min={0} className="full-width" />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'originPrice']} label="划线价">
                    <InputNumber min={0} className="full-width" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'stock']}
                    label="库存"
                    rules={[{ required: true, message: '请输入库存' }]}
                  >
                    <InputNumber min={0} className="full-width" />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'specsText']} label="规格 JSON">
                    <Input placeholder='{"规格":"50ml"}' />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'isActive']}
                    label="启用"
                    valuePropName="checked"
                    initialValue
                  >
                    <Switch />
                  </Form.Item>
                  <Button
                    icon={<MinusCircleOutlined />}
                    disabled={fields.length <= 1}
                    onClick={() => remove(field.name)}
                  />
                </div>
              ))}
              <Button
                icon={<PlusOutlined />}
                onClick={() => add({ name: '新规格', price: 0, stock: 0, isActive: true })}
              >
                添加 SKU
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
