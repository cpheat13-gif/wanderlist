import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface LightboxContextValue {
  // Open the viewer with one or more image URLs, starting at `index`.
  open: (images: string | string[], index?: number) => void;
}

const LightboxContext = createContext<LightboxContextValue>({ open: () => {} });
export const useLightbox = () => useContext(LightboxContext);

// App-wide full-screen photo viewer. Wrap the app once, then call
// useLightbox().open(url) from any pressable image.
export function LightboxProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<string[]>([]);
  const [start, setStart] = useState(0);
  const [visible, setVisible] = useState(false);

  const open = useCallback((imgs: string | string[], index = 0) => {
    const list = (Array.isArray(imgs) ? imgs : [imgs]).filter(Boolean);
    if (list.length === 0) return;
    setImages(list);
    setStart(Math.max(0, Math.min(index, list.length - 1)));
    setVisible(true);
  }, []);

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingTop: 6 }}>
              <Pressable
                onPress={() => setVisible(false)}
                hitSlop={12}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: 'white', fontSize: 19 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: start * SCREEN_W, y: 0 }}
              style={{ flex: 1 }}
            >
              {images.map((uri, i) => (
                <Pressable key={i} onPress={() => setVisible(false)} style={{ width: SCREEN_W, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={{ uri }} style={{ width: SCREEN_W, height: SCREEN_H * 0.82 }} contentFit="contain" transition={150} />
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingVertical: 12, fontSize: 12 }}>
              {images.length > 1 ? `Swipe · ${images.length} photos` : 'Tap to close'}
            </Text>
          </SafeAreaView>
        </View>
      </Modal>
    </LightboxContext.Provider>
  );
}
