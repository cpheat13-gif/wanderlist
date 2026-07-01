import { Text, View, ViewProps } from 'react-native';

interface SectionLabelProps extends ViewProps {
  children: string;
}

export function SectionLabel({ children, className, ...rest }: SectionLabelProps) {
  return (
    <View className={className} {...rest}>
      <Text className="text-textMuted text-xs font-semibold uppercase" style={{ letterSpacing: 3 }}>
        {children}
      </Text>
    </View>
  );
}
