import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fetchTikTokOEmbed, TikTokOEmbed } from '../lib/tiktok';

export function TikTokEmbed({ url }: { url: string }) {
  const [data, setData] = useState<TikTokOEmbed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchTikTokOEmbed(url)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load TikTok preview.');
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(url)}
      className="rounded-2xl overflow-hidden bg-surface border border-white/10"
    >
      {data?.thumbnail_url ? (
        <Image source={{ uri: data.thumbnail_url }} style={{ width: '100%', height: 220 }} contentFit="cover" />
      ) : (
        <View className="h-40 items-center justify-center bg-surfaceAlt">
          <Text className="text-textMuted text-sm">{error ?? 'Loading TikTok preview…'}</Text>
        </View>
      )}
      {data ? (
        <View className="p-4">
          <Text className="text-text font-semibold" numberOfLines={2}>
            {data.title}
          </Text>
          <Text className="text-textMuted text-sm mt-1">@{data.author_name}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
