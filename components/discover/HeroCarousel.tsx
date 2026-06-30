import { FlatList, useWindowDimensions } from 'react-native';
import { HeroCard } from './HeroCard';
import { DestinationSuggestion } from '../../lib/ai';
import { DestinationPhoto } from '../../lib/unsplash';

export function HeroCarousel({
  suggestions,
  photosByKey,
  keyFor,
  creatingKey,
  onGo,
}: {
  suggestions: DestinationSuggestion[];
  photosByKey: Record<string, DestinationPhoto | null>;
  keyFor: (s: DestinationSuggestion) => string;
  creatingKey: string | null;
  onGo: (s: DestinationSuggestion) => void;
}) {
  const { width, height } = useWindowDimensions();
  const cardHeight = Math.min(height * 0.68, 640);

  return (
    <FlatList
      data={suggestions}
      keyExtractor={keyFor}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      snapToInterval={width}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <HeroCard
          suggestion={item}
          photo={photosByKey[keyFor(item)]}
          width={width}
          height={cardHeight}
          loading={creatingKey === keyFor(item)}
          onGo={() => onGo(item)}
        />
      )}
    />
  );
}
