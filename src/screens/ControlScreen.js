import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { apiCall } from '../api/client';

export default function ControlScreen({ navigation }) {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const data = await apiCall('/api/status');
      setStatus(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleForwarding = async () => {
    setLoading(true);
    try {
      const action = status.forwarding_enabled ? 'pause' : 'resume';
      await apiCall('/api/forwarding', 'POST', { action });
      refresh();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const retryFailed = async () => {
    try {
      await apiCall('/api/retry_failed', 'POST');
      alert('Retried failed items');
      refresh();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Forwarding</Text>
        <Text style={styles.value}>{status.forwarding_enabled ? '▶️ Running' : '⏸️ Paused'}</Text>
        <Button title={status.forwarding_enabled ? 'Pause' : 'Resume'} onPress={toggleForwarding} disabled={loading} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Stats</Text>
        <Text>Forwarded: {status.stats?.forwarded || 0}</Text>
        <Text>Failed: {status.stats?.failed || 0}</Text>
        <Text>Queue: {status.queue_queued || 0} queued / {status.queue_failed || 0} failed</Text>
        <Text>Success Rate: {status.success_rate || 0}%</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>System</Text>
        <Text>Uptime: {Math.floor((status.uptime_seconds || 0) / 3600)}h {Math.floor(((status.uptime_seconds || 0) % 3600) / 60)}m</Text>
        <Text>Memory: {status.memory_mb || 0} MB</Text>
        <Text>Telegram: {status.telegram_connected ? '✅' : '❌'}</Text>
        <Text>Discord: {status.discord_connected ? '✅' : '❌'}</Text>
        <Text>Active Sources: {status.active_sources || 0}</Text>
      </View>

      <View style={styles.card}>
        <Button title="Retry Failed Queue" onPress={retryFailed} />
        <Button title="View Logs" onPress={() => navigation.navigate('Logs')} />
        <Button title="Manage Sources" onPress={() => navigation.navigate('Sources')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  value: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
});