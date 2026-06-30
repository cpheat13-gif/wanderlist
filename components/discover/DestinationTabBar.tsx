import { Pressable, Text, View } from 'react-native';

export type DestinationTab = 'list' | 'explorer' | 'flights' | 'chat';

const TABS: { key: DestinationTab; label: string; glyph: string }[] = [
  { key: 'list', label: 'My List', glyph: '≡' },
  { key: 'explorer', label: 'Explore', glyph: '⊙' },
  { key: 'flights', label: 'Flights', glyph: '✈︎' },
  { key: 'chat', label: 'Chat', glyph: '✉' },
];

export function DestinationTabBar({
  active,
  onChange,
}: {
  active: DestinationTab;
  onChange: (tab: DestinationTab) => void;
}) {
  return (
    <View className="absolute left-5 right-5 bottom-6 flex-row bg-white rounded-full px-2 py-2 shadow-lg">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={`flex-1 items-center py-2 rounded-full ${isActive ? 'bg-neutral-900' : ''}`}
          >
            <Text className={isActive ? 'text-white' : 'text-neutral-400'} style={{ fontSize: 16 }}>
              {tab.glyph}
            </Text>
            <Text className={`text-[10px] mt-0.5 ${isActive ? 'text-white' : 'text-neutral-400'}`}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
