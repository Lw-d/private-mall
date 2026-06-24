import { Breadcrumb } from 'antd';

interface PageBreadcrumbProps {
  className?: string;
  title: string;
}

export function PageBreadcrumb({ className, title }: PageBreadcrumbProps) {
  const classes = ['page-breadcrumb', className].filter(Boolean).join(' ');

  return <Breadcrumb className={classes} items={[{ title: '商家工作台' }, { title }]} />;
}
