import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiCall } from '../api/client';

export default function SourceCard({ source, onToggle, onRemove }) {
  const [showDetails, setShowDetails] = useState(false);
  const [method, setMethod] = useState(source.filters?.forwarding_method || 'auto');
  const [username, setUsername] = useState(source.filters?.username || '');
  const [startDate, setStartDate] = useState(source.start_date || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(
    source.start_date ? new Date(source.start_date) : new Date()
  );

  const isTelegram = source.platform === 'telegram';

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

  const updateStartDate = async () => {
    try {
      await apiCall(`/api/sources/${source.channel_id}/start_date`, 'POST', { date: startDate || null });
      Alert.alert('Updated', 'Start date updated');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || tempDate;
    setShowDatePicker(Platform.OS === 'ios');
    setTempDate(currentDate);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    setStartDate(`${year}-${month}-${day}`);
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
          {/* Start Date */}
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
              <Text style={styles.dateButtonText}>Pick Start Date</Text>
            </TouchableOpacity>
            <Text style={styles.dateDisplay}>{startDate || 'No date set'}</Text>
            <TouchableOpacity onPress={updateStartDate}>
              <Text style={styles.actionBtn}>Set Date</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}

          {/* Telegram‑specific fields */}
          {isTelegram ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Method:</Text>
                <TextInput
                  style={styles.smallInput}
                  value={method}
                  onChangeText={setMethod}
                  placeholder="auto / api / scrape"
                />
                <TouchableOpacity onPress={updateMethod}>
                  <Text style={styles.actionBtn}>Set</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Username:</Text>
                <TextInput
                  style={styles.smallInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="@username (optional)"
                />
                <TouchableOpacity onPress={updateUsername}>
                  <Text style={styles.actionBtn}>Set</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                {method === 'scrape'
                  ? '🔍 Scrape mode: Media fetched via web scraper.'
                  : method === 'api'
                  ? '📡 API mode: Only Telegram API is used.'
                  : '🔄 Auto mode: API first, fallback to scraper if needed.'}
              </Text>
              <Text style={styles.helperText}>
                Scrape Required: {source.scrape_required ? '✅ Yes' : '❌ No'}
              </Text>
            </>
          ) : (
            <Text style={styles.helperText}>
              📌 Discord sources are always scraped via the Discord web scraper.
              Method and username do not apply.
            </Text>
          )}
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
  dateButton: { backgroundColor: '#007AFF', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  dateButtonText: { color: 'white', fontSize: 12 },
  dateDisplay: { flex: 1, fontSize: 12, color: '#333', marginLeft: 8 },
  label: { fontSize: 12, fontWeight: 'bold', marginRight: 6 },
  helperText: { fontSize: 11, color: '#555', marginTop: 4 },
});