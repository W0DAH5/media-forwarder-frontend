import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import SetupScreen from './src/screens/SetupScreen';
import SourcesScreen from './src/screens/SourcesScreen';
import ControlScreen from './src/screens/ControlScreen';
import LogsScreen from './src/screens/LogsScreen';
import { apiCall, setBaseURL } from './src/api/client';

const Stack = createStackNavigator();

const CURRENT_VERSION = '1.0.1'; // increment manually for each release

export default function App() {
  const [isSetup, setIsSetup] = React.useState(null);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    const token = await AsyncStorage.getItem('web_ui_token');
    const url = await AsyncStorage.getItem('server_url');
    const setup = !!(token && url);
    setIsSetup(setup);
    if (setup) {
      setBaseURL(url);
      // Check for updates after a short delay
      setTimeout(checkForUpdates, 3000);
    }
  };

  const checkForUpdates = async () => {
    try {
      const res = await apiCall('/api/version');
      const latestVersion = res.version;
      if (latestVersion !== CURRENT_VERSION) {
        Alert.alert(
          'Update Available',
          `Version ${latestVersion} is available. Download now?`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Download', onPress: downloadAndInstall },
          ]
        );
      }
    } catch (e) {
      // silently fail – update check is non‑critical
    }
  };

  const downloadAndInstall = async () => {
    // Use GitHub release asset or your own server
    const downloadUrl = 'https://github.com/W0DAH5/media-forwarder-frontend/releases/latest/download/app-release.apk';
    // Fallback: if you host APK on your backend, use:
    // const downloadUrl = 'https://your-backend.onrender.com/static/app-release.apk';
    const localUri = FileSystem.documentDirectory + 'app-release.apk';

    try {
      const { uri } = await FileSystem.downloadAsync(downloadUrl, localUri);
      if (Platform.OS === 'android') {
        // Open the APK with the system installer
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.VIEW, {
          data: uri,
          type: 'application/vnd.android.package-archive',
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        });
      } else {
        Alert.alert('Downloaded', `APK saved to ${uri}`);
      }
    } catch (e) {
      Alert.alert('Download failed', e.message);
    }
  };

  if (isSetup === null) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isSetup ? 'Control' : 'Setup'}>
        <Stack.Screen name="Setup" component={SetupScreen} options={{ title: 'Setup' }} />
        <Stack.Screen name="Sources" component={SourcesScreen} options={{ title: 'Sources' }} />
        <Stack.Screen name="Control" component={ControlScreen} options={{ title: 'Control Panel' }} />
        <Stack.Screen name="Logs" component={LogsScreen} options={{ title: 'Logs' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}