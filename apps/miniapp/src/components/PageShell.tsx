import { View } from '@tarojs/components';
import type { PropsWithChildren } from 'react';

import './PageShell.css';

interface PageShellProps extends PropsWithChildren {
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return <View className={className ? `page-shell ${className}` : 'page-shell'}>{children}</View>;
}
