import { Button, Input, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { fetchUsers } from '../api/adminApi';
import { showApiError } from '../api/error';
import { User } from '../api/types';

export function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await fetchUsers({ keyword: keyword.trim() || undefined }));
    } catch (error) {
      showApiError(error, '用户加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const columns = useMemo(
    () => [
      {
        title: '昵称',
        render: (_: unknown, record: User) => record.nickname ?? '-',
      },
      { title: 'OpenID', dataIndex: 'openId' },
      {
        title: '手机号',
        render: (_: unknown, record: User) => record.phone ?? '-',
      },
      {
        title: '会员',
        render: (_: unknown, record: User) => (
          <Space size={6}>
            <Tag color="cyan">V{record.memberLevel}</Tag>
            <Typography.Text type="secondary">{record.growthValue} 成长值</Typography.Text>
          </Space>
        ),
      },
      {
        title: '积分',
        render: (_: unknown, record: User) => record.pointsBalance,
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (value: User['status']) => (
          <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value}</Tag>
        ),
      },
      {
        title: '最近登录',
        render: (_: unknown, record: User) =>
          record.lastLoginAt ? new Date(record.lastLoginAt).toLocaleString() : '-',
      },
      {
        title: '注册时间',
        render: (_: unknown, record: User) => new Date(record.createdAt).toLocaleString(),
      },
    ],
    [],
  );

  return (
    <section className="page">
      <div className="page-title">
        <Typography.Title level={4}>用户管理</Typography.Title>
        <Typography.Text type="secondary">
          查看用户资料，按昵称、OpenID 或手机号检索。
        </Typography.Text>
      </div>
      <Space className="toolbar" wrap>
        <Input.Search
          allowClear
          placeholder="昵称 / OpenID / 手机号"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={() => void load()}
          className="user-search"
        />
        <Button type="primary" onClick={() => void load()}>
          查询
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={users}
        pagination={false}
      />
    </section>
  );
}
