import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme'; // Import Colors
import { useColorScheme } from '@/hooks/use-color-scheme'; // Import useColorScheme
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Linking,
  Platform,
  RefreshControl, // Re-add RefreshControl
  ScrollView, // Import ScrollView
  StatusBar,
  StyleSheet,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function WebViewScreen() {
  const webviewRef = useRef<WebView>(null);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true); // New state to track if WebView is at the top
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  // Animate progress bar
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webviewRef.current) {
          webviewRef.current.goBack();
          return true;
        } else {
          navigation.goBack();
          return true;
        }
      });
      return () => backHandler.remove();
    }
  }, [canGoBack, navigation]);

  const onLoadStart = () => setProgress(0);
  const onLoadProgress = (event: any) => setProgress(event.nativeEvent.progress);
  const handleNavigationStateChange = (navState: any) => setCanGoBack(navState.canGoBack);

  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;
    if (url.startsWith('https://vistara.live/')) return true;
    if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('https://wa.me')) {
      Linking.openURL(url).catch(console.error);
      return false;
    }
    Linking.openURL(url).catch(console.error);
    return false;
  };

  const injectedJS = `
    (function() {
      document.documentElement.style.overflow = 'scroll';
      document.body.style.overflow = 'scroll';
      window.open = function(url) { window.location.href = url; return null; };
      document.addEventListener('click', function(e) {
        var a = e.target.closest('a');
        if (a && a.target === '_blank') {
          e.preventDefault();
          var href = a.href;
          if (href.startsWith('https://vistara.live/')) {
            window.location.href = href;
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({ url: href }));
          }
        }
      }, true);
    })();
    true;
  `;

  const onMessage = (event: any) => {
    try {
      const { url } = JSON.parse(event.nativeEvent.data);
      if (url) Linking.openURL(url).catch(console.error);
    } catch {}
  };

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setIsAtTop(contentOffset.y === 0);
  };

  const onRefresh = () => {
    if (isAtTop) {
      setRefreshing(true);
      webviewRef.current?.reload();
    }
  };

  const colorScheme = useColorScheme(); // Get current color scheme
  const tintColor = Colors[colorScheme ?? 'light'].tint; // Determine tint color based on scheme

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" animated />
      <SafeAreaView style={styles.safeArea}>
        {/* Progress Bar */}
        {progress < 1 && (
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: animatedWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: tintColor, // Use consistent tint color
                },
              ]}
            />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tintColor} // Use consistent tint color
              colors={[tintColor]} // Use consistent tint color
              progressBackgroundColor="#000000" // Set background color of the refresh indicator to white
              enabled={isAtTop} // Only enable refresh control when at the top
            />
          }
          scrollEnabled={isAtTop} // Only enable ScrollView scrolling when at the top
        >
          <WebView
            ref={webviewRef}
            source={{ uri: 'https://vistara.live/' }}
            style={styles.webview}
            onLoadStart={onLoadStart}
            onLoadProgress={onLoadProgress}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            javaScriptEnabled
            domStorageEnabled
            injectedJavaScript={injectedJS}
            onMessage={onMessage}
            onNavigationStateChange={handleNavigationStateChange}
            onScroll={handleScroll} // Add onScroll handler
            bounces={false} // Disable bounces on WebView
            overScrollMode="never" // Disable overscroll on WebView
            pullToRefreshEnabled={false} // Disable pull-to-refresh on WebView
            scrollEnabled={false} // Disable WebView's internal scrolling
            onLoadEnd={() => setRefreshing(false)}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, backgroundColor: '#000' },
  progressContainer: { height: 4, backgroundColor: '#222', overflow: 'hidden' },
  progressBar: { height: '100%' }, // Remove hardcoded background color
  webview: { flex: 1 },
  scrollViewContent: { flexGrow: 1 }, // Ensure ScrollView content takes full height
});
