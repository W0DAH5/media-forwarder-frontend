import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { apiCall } from '../api/client';

export default function LogsScreen() {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiCall('/api/logs?lines=200');
      setLogs(res.logs || 'No logs');
    } catch (e) {
      setLogs('Error fetching logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Refresh Logs" onPress={fetchLogs} disabled={loading} />
      <ScrollView style={styles.logBox}>
        <Text style={styles.logText}>{logs}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  logBox: { flex: 1, marginTop: 12, backgroundColor: '#1e1e1e', borderRadius: 8, padding: 8 },
  logText: { color: '#d4d4d4', fontSize: 12, fontFamily: 'monospace' },
});