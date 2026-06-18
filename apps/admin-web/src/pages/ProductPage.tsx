import {
  Button,
  Descriptions,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  updateProduct,
  updateProductStatus,
} from '../api/adminApi';
import { showApiError } from '../api/error';
import { Category, Product, ProductInput, ProductStatus } from '../api/types';
import { ProductFormModal } from './ProductFormModal';

const statusOptions: { value: ProductStatus; label: string }[] = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'ON_SALE', label: '上架' },
  { value: 'OFF_SALE', label: '下架' },
];

const statusTextMap: Record<ProductStatus, string> = {
  DRAFT: '草稿',
  ON_SALE: '上架',
  OFF_SALE: '下架',
};

const statusColorMap: Record<ProductStatus, string> = {
  DRAFT: 'default',
  ON_SALE: 'green',
  OFF_SALE: 'orange',
};

function renderSpecs(specs?: Record<string, string> | null) {
  if (!specs || Object.keys(specs).length === 0) {
    return '-';
  }

  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' / ');
}

export function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ProductStatus | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  const load = async () => {
    setLoading(true);
    try {
      const [nextProducts, nextCategories] = await Promise.all([
        fetchProducts({ keyword, status }),
        fetchCategories(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
    } catch (error) {
      showApiError(error, '商品加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditingProduct(undefined);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleSubmit = async (input: ProductInput) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, input);
      message.success('商品已更新');
    } else {
      await createProduct(input);
      message.success('商品已创建');
    }

    setModalOpen(false);
    setEditingProduct(undefined);
    await load();
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      await updateProductStatus(product.id, product.status === 'ON_SALE' ? 'OFF_SALE' : 'ON_SALE');
      message.success(product.status === 'ON_SALE' ? '商品已下架' : '商品已上架');
      await load();
    } catch (error) {
      showApiError(error, '状态更新失败');
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      message.success('商品已删除');
      await load();
    } catch (error) {
      showApiError(error, '删除失败');
    }
  };

  const columns = useMemo(
    () => [
      { title: '商品', dataIndex: 'name', width: 220 },
      {
        title: '分类',
        render: (_: unknown, record: Product) => record.category?.name ?? '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (value: ProductStatus) => (
          <Tag color={statusColorMap[value]}>{statusTextMap[value]}</Tag>
        ),
      },
      {
        title: 'SKU',
        render: (_: unknown, record: Product) => record.skus.length,
      },
      {
        title: '库存',
        render: (_: unknown, record: Product) =>
          record.skus.reduce((sum, sku) => sum + sku.stock, 0),
      },
      {
        title: '价格',
        render: (_: unknown, record: Product) => record.skus[0]?.price ?? '-',
      },
      {
        title: '操作',
        render: (_: unknown, record: Product) => (
          <Space>
            <Button size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button size="small" onClick={() => void toggleProductStatus(record)}>
              {record.status === 'ON_SALE' ? '下架' : '上架'}
            </Button>
            <Popconfirm
              title="确认删除商品？"
              description="删除会同步移除 SKU 和图片；已有订单的商品请先下架。"
              okText="确认删除"
              cancelText="返回"
              onConfirm={() => void handleDelete(record)}
            >
              <Button size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [keyword, status],
  );

  const expandedRowRender = (product: Product) => (
    <Space direction="vertical" size={16} className="full-width">
      <Descriptions size="small" column={{ xs: 1, md: 2, lg: 3 }} bordered>
        <Descriptions.Item label="商品名">{product.name}</Descriptions.Item>
        <Descriptions.Item label="分类">{product.category?.name ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={statusColorMap[product.status]}>{statusTextMap[product.status]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="副标题">{product.subtitle ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="排序">{product.sort}</Descriptions.Item>
        <Descriptions.Item label="销量">{product.salesCount}</Descriptions.Item>
        <Descriptions.Item label="详情">{product.description ?? '-'}</Descriptions.Item>
      </Descriptions>
      <Table
        rowKey="id"
        size="small"
        columns={[
          { title: 'SKU 名称', dataIndex: 'name' },
          { title: '编码', dataIndex: 'skuCode', render: (value?: string | null) => value ?? '-' },
          {
            title: '规格',
            render: (_: unknown, sku: Product['skus'][number]) => renderSpecs(sku.specs),
          },
          { title: '价格', dataIndex: 'price' },
          {
            title: '划线价',
            dataIndex: 'originPrice',
            render: (value?: string | null) => value ?? '-',
          },
          { title: '库存', dataIndex: 'stock' },
          {
            title: '启用',
            dataIndex: 'isActive',
            render: (value: boolean) => (
              <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>
            ),
          },
        ]}
        dataSource={product.skus}
        pagination={false}
      />
      <Table
        rowKey="id"
        size="small"
        columns={[
          {
            title: '类型',
            dataIndex: 'isMain',
            width: 90,
            render: (value: boolean) => (
              <Tag color={value ? 'blue' : 'default'}>{value ? '主图' : '图片'}</Tag>
            ),
          },
          { title: '排序', dataIndex: 'sort', width: 90 },
          {
            title: 'URL',
            dataIndex: 'url',
            render: (value: string) => (
              <Typography.Text className="breakable-text" copyable>
                {value}
              </Typography.Text>
            ),
          },
        ]}
        dataSource={product.images}
        pagination={false}
      />
    </Space>
  );

  return (
    <section className="page">
      <div className="page-title">
        <Typography.Title level={4}>商品管理</Typography.Title>
        <Typography.Text type="secondary">查看商品、SKU、库存和上下架状态。</Typography.Text>
      </div>
      <Space className="toolbar" wrap>
        <Input.Search
          placeholder="搜索商品"
          value={keyword}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)}
          onSearch={() => void load()}
        />
        <Select
          allowClear
          placeholder="状态"
          value={status}
          options={statusOptions}
          onChange={(value: ProductStatus | undefined) => setStatus(value)}
          className="status-select"
        />
        <Button type="primary" onClick={() => void load()}>
          查询
        </Button>
        <Button type="primary" ghost onClick={openCreate}>
          新增商品
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={products}
        expandable={{ expandedRowRender }}
        pagination={false}
      />
      <ProductFormModal
        categories={categories}
        initialProduct={editingProduct}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingProduct(undefined);
        }}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
