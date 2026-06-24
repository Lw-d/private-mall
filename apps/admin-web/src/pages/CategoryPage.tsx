import {
  Button,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Tree,
  TreeSelect,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../api/adminApi';
import { showApiError } from '../api/error';
import { Category } from '../api/types';
import { appMessage } from '../utils/appMessage';

function toTreeData(
  categories: Category[],
): { title: string; key: string; children?: ReturnType<typeof toTreeData> }[] {
  return categories.map((category) => ({
    title: `${category.name} · L${category.level}`,
    key: category.id,
    children: category.children ? toTreeData(category.children) : undefined,
  }));
}

function toSelectTreeData(
  categories: Category[],
): { title: string; value: string; children?: ReturnType<typeof toSelectTreeData> }[] {
  return categories.map((category) => ({
    title: category.name,
    value: category.id,
    children: category.children ? toSelectTreeData(category.children) : undefined,
  }));
}

function findCategory(categories: Category[], id: string): Category | undefined {
  for (const category of categories) {
    if (category.id === id) {
      return category;
    }

    const child = category.children ? findCategory(category.children, id) : undefined;

    if (child) {
      return child;
    }
  }

  return undefined;
}

interface CategoryFormValues {
  name: string;
  parentId?: string;
  sort?: number;
  isVisible?: boolean;
  description?: string;
}

export function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<CategoryFormValues>();

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await fetchCategories());
    } catch (error) {
      showApiError(error, '分类加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ sort: 0, isVisible: true });
  };

  const handleSelect = (keys: React.Key[]) => {
    const selectedId = keys[0]?.toString();

    if (!selectedId) {
      return;
    }

    const category = findCategory(categories, selectedId);

    if (!category) {
      return;
    }

    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      parentId: category.parentId ?? undefined,
      sort: category.sort,
      isVisible: category.isVisible,
      description: category.description ?? undefined,
    });
  };

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          ...values,
          parentId: values.parentId ?? null,
        });
        appMessage.success('分类已更新');
      } else {
        await createCategory(values);
        appMessage.success('分类已创建');
      }

      resetForm();
      await load();
    } catch (error) {
      showApiError(error, editingCategory ? '分类更新失败' : '分类创建失败');
    }
  };

  const handleDelete = async () => {
    if (!editingCategory) return;

    try {
      await deleteCategory(editingCategory.id);
      appMessage.success('分类已删除');
      resetForm();
      await load();
    } catch (error) {
      showApiError(error, '分类删除失败');
    }
  };

  const handleRefresh = async () => {
    resetForm();
    await load();
  };

  const selectTreeData = toSelectTreeData(categories);

  return (
    <section className="page two-column">
      <div>
        <Spin spinning={loading}>
          <Tree
            blockNode
            showLine
            selectedKeys={editingCategory ? [editingCategory.id] : []}
            treeData={toTreeData(categories)}
            onSelect={handleSelect}
          />
        </Spin>
      </div>
      <div className="side-panel">
        <Typography.Title level={5}>{editingCategory ? '编辑分类' : '新增分类'}</Typography.Title>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ sort: 0, isVisible: true }}
          onFinish={(values) => void handleSubmit(values)}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="parentId" label="父级分类">
            <TreeSelect
              allowClear
              placeholder="为空则为一级分类"
              treeData={selectTreeData}
              treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} className="full-width" />
          </Form.Item>
          <Form.Item name="isVisible" label="显示" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit">
              {editingCategory ? '保存' : '创建'}
            </Button>
            <Button onClick={handleRefresh}>刷新</Button>
            <Button onClick={resetForm}>新建</Button>
            {editingCategory ? (
              <Popconfirm
                title="确认删除分类？"
                description="存在子分类或商品时，后端会阻止删除。"
                okText="确认删除"
                cancelText="返回"
                onConfirm={() => void handleDelete()}
              >
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
          </Space>
        </Form>
      </div>
    </section>
  );
}
