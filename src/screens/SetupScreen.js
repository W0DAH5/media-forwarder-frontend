import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testConnection, setBaseURL } from '../api/client';

export default function SetupScreen({ navigation }) {
  const [serverUrl, setServerUrl] = useState('');
  const [webToken, setWebToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!serverUrl || !webToken) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const ok = await testConnection(serverUrl, webToken);
      if (!ok) {
        Alert.alert('Error', 'Cannot connect to server. Check URL and token.');
        return;
      }
      await AsyncStorage.setItem('server_url', serverUrl);
      await AsyncStorage.setItem('web_ui_token', webToken);
      setBaseURL(serverUrl);
      Alert.alert('Success', 'Connected!');
      navigation.replace('Sources');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Media Forwarder Setup</Text>
      <Text style={styles.sub}>Enter your server details</Text>
      <TextInput
        style={styles.input}
        placeholder="Server URL (e.g., https://my-forwarder.repl.co)"
        value={serverUrl}
        onChangeText={setServerUrl}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Web UI Token"
        value={webToken}
        onChangeText={setWebToken}
        secureTextEntry
        autoCapitalize="none"
      />
      <Button title={loading ? 'Connecting...' : 'Connect'} onPress={handleSave} disabled={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  sub: { fontSize: 16, color: '#666', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 },
});