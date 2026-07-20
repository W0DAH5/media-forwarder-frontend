import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { apiCall } from '../api/client';

export default function SourceCard({ source, onToggle, onRemove }) {
  const [showDetails, setShowDetails] = useState(false);
  const [method, setMethod] = useState(source.forwarding_method || 'auto');
  const [username, setUsername] = useState(source.filters?.username || '');

  const updateMethod = async () => {
    try {
      await apiCall(`/api/sources/${source.channel_id}/method`, 'POST', { method });
      Alert.alert('Updated', 'Forwarding method updated');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const updateUsername = async () => {
    try {
      await apiCall(`/api/sources/${source.channel_id}/username`, 'POST', { username });
      Alert.alert('Updated', 'Username updated');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.platform}>{source.platform}</Text>
        <Text style={styles.channelId}>{source.channel_id}</Text>
        <Text style={[styles.status, source.enabled ? styles.enabled : styles.disabled]}>
          {source.enabled ? '✅' : '⏸️'}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onToggle(source.channel_id, !source.enabled)}>
          <Text style={styles.actionBtn}>{source.enabled ? 'Disable' : 'Enable'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onRemove(source.channel_id)}>
          <Text style={[styles.actionBtn, styles.remove]}>Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowDetails(!showDetails)}>
          <Text style={styles.actionBtn}>Details</Text>
        </TouchableOpacity>
      </View>
      {showDetails && (
        <View style={styles.details}>
          <Text>Start Date: {source.start_date || 'None'}</Text>
          <Text>Scrape Required: {source.scrape_required ? 'Yes' : 'No'}</Text>
          <Text>Last Scraped ID: {source.last_scraped_id || 'None'}</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.smallInput}
              value={method}
              onChangeText={setMethod}
              placeholder="method (auto/api/scrape)"
            />
            <TouchableOpacity onPress={updateMethod}>
              <Text style={styles.actionBtn}>Set Method</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TextInput
              style={styles.smallInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Telegram username"
            />
            <TouchableOpacity onPress={updateUsername}>
              <Text style={styles.actionBtn}>Set Username</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  platform: { fontWeight: 'bold', width: 80 },
  channelId: { flex: 1, fontSize: 12, color: '#555' },
  status: { fontSize: 18 },
  enabled: { color: 'green' },
  disabled: { color: 'gray' },
  actions: { flexDirection: 'row', gap: 16 },
  actionBtn: { color: '#007AFF', marginRight: 16, fontSize: 14 },
  remove: { color: '#FF3B30' },
  details: { marginTop: 8, borderTopWidth: 1, borderColor: '#ddd', paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  smallInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 4, flex: 1, marginRight: 8 },
});