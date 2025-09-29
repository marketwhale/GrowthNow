import { ThemedView } from '@/components/themed-view';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function WebViewScreen() {
  const webviewRef = useRef<WebView>(null);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // ✅ Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webviewRef.current) {
          webviewRef.current.goBack();
          return true; // prevent default exit
        } else {
          navigation.goBack(); // leave the screen
          return true;
        }
      });
      return () => backHandler.remove();
    }
  }, [canGoBack, navigation]);

  const onLoadStart = () => setProgress(0);
  const onLoadProgress = (event: any) => setProgress(event.nativeEvent.progress);

  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;
    if (url.startsWith('https://growthnow.marketwhaleai.com/')) return true;

    if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('https://wa.me')) {
      Linking.openURL(url).catch(err => console.error('Failed to open link:', err));
      return false;
    }

    Linking.openURL(url).catch(err => console.error('Failed to open link:', err));
    return false;
  };

  // ✅ Track if WebView can go back
  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const injectedJS = `
    (function() {
      window.open = function(url) { window.location.href = url; return null; };

      document.addEventListener('click', function(e) {
        var a = e.target.closest('a');
        if (a && a.target === '_blank') {
          e.preventDefault();
          var href = a.href;
          if (href.startsWith('https://growthnow.marketwhaleai.com/')) {
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
      if (url) Linking.openURL(url).catch(err => console.error('Failed to open link:', err));
    } catch {}
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" animated />

      <SafeAreaView style={styles.safeArea}>
        {progress < 1 && (
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: animatedWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
        )}

        <WebView
          ref={webviewRef}
          source={{ uri: 'https://growthnow.marketwhaleai.com/' }}
          style={styles.webview}
          onLoadStart={onLoadStart}
          onLoadProgress={onLoadProgress}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          javaScriptEnabled
          domStorageEnabled
          injectedJavaScript={injectedJS}
          onMessage={onMessage}
          onNavigationStateChange={handleNavigationStateChange} // ✅ track history
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, backgroundColor: '#000' },
  progressContainer: { height: 4, backgroundColor: '#222', overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#00FFDD' },
  webview: { flex: 1 },
});
