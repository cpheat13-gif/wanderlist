import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'glass' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function PillButton({
  label,
  onPress,
  variant = 'glass',
  loading = false,
  disabled = false,
  icon,
  className,
}: PillButtonProps) {
  const base = 'flex-row items-center justify-center gap-2 rounded-full px-5 py-3';
  const variants: Record<typeof variant, string> = {
    solid: 'bg-accent',
    glass: 'bg-white/10 border border-white/15',
    ghost: 'bg-transparent',
  };
  const textVariants: Record<typeof variant, string> = {
    solid: 'text-bg font-semibold',
    glass: 'text-text font-medium',
    ghost: 'text-textMuted font-medium',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-40' : ''} ${className ?? ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? '#0B0B0E' : '#F5F3EE'} />
      ) : (
        <>
          {icon}
          <Text className={textVariants[variant]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
