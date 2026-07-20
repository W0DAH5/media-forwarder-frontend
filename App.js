import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SetupScreen from './src/screens/SetupScreen';
import SourcesScreen from './src/screens/SourcesScreen';
import ControlScreen from './src/screens/ControlScreen';
import LogsScreen from './src/screens/LogsScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isSetup, setIsSetup] = React.useState(null);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    const token = await AsyncStorage.getItem('web_ui_token');
    const url = await AsyncStorage.getItem('server_url');
    setIsSetup(!!token && !!url);
  };

  if (isSetup === null) return null; // loading

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