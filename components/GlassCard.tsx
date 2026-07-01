import { ReactNode } from 'react';
import { View, ViewProps } from 'react-native';

export function GlassCard({ children, className, ...rest }: ViewProps & { children: ReactNode }) {
  return (
    <View
      className={`bg-surface/80 border border-white/10 rounded-2xl ${className ?? ''}`}
      {...rest}
    >
      {children}
    </View>
  );
}
