import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Button,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiCall, getTelegramDialogs } from '../api/client';
import SourceCard from '../components/SourceCard';

export default function SourcesScreen({ navigation }) {
  const [sources, setSources] = useState([]);
  const [telegramChats, setTelegramChats] = useState([]);
  const [showChatPicker, setShowChatPicker] = useState(false);
  const [selectedChats, setSelectedChats] = useState({});
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [selectedDest, setSelectedDest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Discord multi‑add modal
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [discordIdsInput, setDiscordIdsInput] = useState('');
  const [discordStartDate, setDiscordStartDate] = useState('');
  const [discordMethod, setDiscordMethod] = useState('auto');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Backfill modal states
  const [showBackfillModal, setShowBackfillModal] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillPlatform, setBackfillPlatform] = useState('telegram');
  const [backfillSource, setBackfillSource] = useState('');
  const [backfillLimit, setBackfillLimit] = useState('100');

  useEffect(() => {
    loadSources();
    loadTelegramChats();
  }, []);

  const loadSources = async () => {
    try {
      const res = await apiCall('/api/sources');
      setSources(res.sources || []);
    } catch (e) {
      console.error('loadSources error:', e);
    }
  };

  const loadTelegramChats = async () => {
    setRefreshing(true);
    try {
      const items = await getTelegramDialogs();
      console.log(`Loaded ${items.length} Telegram chats`);
      setTelegramChats(items);
      setSelectedChats({});
    } catch (e) {
      console.error('loadTelegramChats error:', e);
      Alert.alert('Error', 'Could not load Telegram chats. Check your connection.');
    } finally {
      setRefreshing(false);
    }
  };

  // ---------- Telegram multi‑add ----------
  const toggleChatSelection = (id) => {
    setSelectedChats((prev) => {
      const newState = { ...prev, [id]: !prev[id] };
      console.log('selectedChats updated:', newState);
      return newState;
    });
  };

  const addSelectedTelegramSources = async () => {
    const selectedIds = Object.keys(selectedChats).filter((id) => selectedChats[id]);
    if (selectedIds.length === 0) {
      Alert.alert('Select at least one chat');
      return;
    }

    if (telegramChats.length === 0) {
      Alert.alert('Reloading chats...', 'Please wait, fetching your chats again.');
      await loadTelegramChats();
      if (telegramChats.length === 0) {
        Alert.alert('Still no chats found. Please check your connection.');
        return;
      }
    }

    setLoading(true);
    let added = 0;
    let skipped = [];

    try {
      for (const id of selectedIds) {
        const chat = telegramChats.find((c) => c.id === id);
        if (!chat) {
          skipped.push(`ID ${id} (not found in current list)`);
          continue;
        }

        let channelId = chat.id;
        if (!channelId && chat.username) {
          channelId = `@${chat.username}`;
        }
        if (!channelId && chat.input) {
          channelId = chat.input;
        }
        if (!channelId) {
          skipped.push(`${chat.name || 'Unknown'} (no valid identifier)`);
          continue;
        }

        console.log(`Sending channel_id: ${channelId} for chat: ${chat.name}`);
        try {
          await apiCall('/api/sources', 'POST', {
            platform: 'telegram',
            channel_id: channelId,
            filters: { username: chat.username || '' },
            forwarding_method: 'auto',
          });
          added++;
        } catch (e) {
          skipped.push(`${chat.name || channelId} (API error: ${e.message})`);
        }
      }

      let msg = `Added ${added} sources.`;
      if (skipped.length > 0) {
        msg += `\nSkipped ${skipped.length}: ${skipped.join(', ')}`;
      }
      Alert.alert('Result', msg);
      setSelectedChats({});
      setShowChatPicker(false);
      await loadSources();
    } catch (e) {
      console.error('addSelectedTelegramSources error:', e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Discord multi‑add ----------
  const addDiscordSources = async () => {
    const ids = discordIdsInput
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (ids.length === 0) {
      Alert.alert('Enter at least one Discord channel ID');
      return;
    }
    setLoading(true);
    try {
      const sourcesToAdd = ids.map((id) => ({
        platform: 'discord',
        channel_id: id,
        filters: { forwarding_method: discordMethod },
        start_date: discordStartDate || null,
      }));
      for (const src of sourcesToAdd) {
        await apiCall('/api/sources', 'POST', src);
      }
      Alert.alert(`Added ${sourcesToAdd.length} Discord channels`);
      setDiscordIdsInput('');
      setDiscordStartDate('');
      setDiscordMethod('auto');
      setShowDiscordModal(false);
      await loadSources();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || tempDate;
    setShowDatePicker(Platform.OS === 'ios');
    setTempDate(currentDate);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    setDiscordStartDate(`${year}-${month}-${day}`);
  };

  // ---------- Destination ----------
  const setDestination = async () => {
    if (!selectedDest) {
      Alert.alert('Please select a destination');
      return;
    }
    const chat = telegramChats.find((c) => c.id === selectedDest);
    let destId = selectedDest;
    if (!destId && chat?.username) {
      destId = `@${chat.username}`;
    }
    if (!destId && chat?.input) {
      destId = chat.input;
    }
    if (!destId) {
      Alert.alert('Error', 'Selected destination has no valid identifier');
      return;
    }
    try {
      await apiCall('/api/destination', 'POST', { channel_id: destId });
      Alert.alert('Destination updated');
      setShowDestPicker(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ---------- Backfill ----------
  const startBackfill = async () => {
    if (!backfillSource.trim()) {
      Alert.alert('Please enter a source (channel ID or username)');
      return;
    }

    const limitNum = parseInt(backfillLimit, 10);
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Enter a valid positive limit');
      return;
    }

    setBackfillLoading(true);
    try {
      const response = await apiCall('/api/backfill', 'POST', {
        platform: backfillPlatform,
        source: backfillSource.trim(),
        limit: limitNum,
      });
      Alert.alert(
        'Backfill Started',
        `Task ID: ${response.task_id}\nProcessing up to ${limitNum} messages.`
      );
      setShowBackfillModal(false);
      setBackfillSource('');
      setBackfillLimit('100');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBackfillLoading(false);
    }
  };

  const renderSource = ({ item }) => (
    <SourceCard
      source={item}
      onToggle={async (id, enable) => {
        await apiCall(`/api/sources/${id}/${enable ? 'enable' : 'disable'}`, 'POST');
        await loadSources();
      }}
      onRemove={async (id) => {
        Alert.alert('Confirm', 'Remove source?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await apiCall(`/api/sources/${id}`, 'DELETE');
              await loadSources();
            },
          },
        ]);
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerButtons}>
        <Button title="➕ Add Telegram Chats" onPress={() => setShowChatPicker(true)} />
        <Button title="📌 Set Destination" onPress={() => setShowDestPicker(true)} />
        <Button title="➕ Add Discord Channels" onPress={() => setShowDiscordModal(true)} />
        <Button title="🔄 Refresh Chats" onPress={loadTelegramChats} />
        <Button
          title="🔄 Backfill"
          onPress={() => setShowBackfillModal(true)}
          color="#841584"
        />
      </View>

      {refreshing && <ActivityIndicator size="large" color="#007AFF" />}

      <FlatList
        data={sources}
        keyExtractor={(item) => item.channel_id}
        renderItem={renderSource}
        ListEmptyComponent={<Text style={styles.empty}>No sources. Add Telegram chats or Discord channels above.</Text>}
        contentContainerStyle={styles.list}
      />

      {/* Telegram Chat Picker Modal */}
      <Modal visible={showChatPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Telegram Chats</Text>
            {telegramChats.length === 0 ? (
              <View style={{ padding: 20 }}>
                <Text>No chats loaded. Tap refresh.</Text>
                <Button title="Refresh" onPress={loadTelegramChats} />
              </View>
            ) : (
              <ScrollView>
                {telegramChats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    onPress={() => toggleChatSelection(chat.id)}
                    style={styles.chatItem}
                  >
                    <Text style={{ flex: 1 }}>
                      {chat.name} {chat.username ? `(@${chat.username})` : ''}
                    </Text>
                    <Text>{selectedChats[chat.id] ? '✅' : '⬜'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setShowChatPicker(false)} />
              <Button title="Add Selected" onPress={addSelectedTelegramSources} disabled={loading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Discord Multi‑Add Modal */}
      <Modal visible={showDiscordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Discord Channels</Text>
            <Text style={styles.helperText}>
              Paste channel IDs separated by commas or spaces.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              placeholder="1510278627990966544, 1510278875677200555, ..."
              value={discordIdsInput}
              onChangeText={setDiscordIdsInput}
            />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                <Text style={styles.dateButtonText}>Pick Start Date</Text>
              </TouchableOpacity>
              <Text style={styles.dateDisplay}>{discordStartDate || 'No date set'}</Text>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Forwarding method (auto / api / scrape)"
              value={discordMethod}
              onChangeText={setDiscordMethod}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setShowDiscordModal(false)} />
              <Button title="Add All" onPress={addDiscordSources} disabled={loading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Destination Picker Modal */}
      <Modal visible={showDestPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Set Destination Channel</Text>
            <ScrollView>
              {telegramChats.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  onPress={() => setSelectedDest(chat.id)}
                  style={styles.chatItem}
                >
                  <Text style={{ flex: 1 }}>
                    {chat.name} {chat.username ? `(@${chat.username})` : ''}
                  </Text>
                  <Text>{selectedDest === chat.id ? '✅' : ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setShowDestPicker(false)} />
              <Button title="Set Destination" onPress={setDestination} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Backfill Modal */}
      <Modal visible={showBackfillModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Backfill Messages</Text>
            <View style={styles.formGroup}>
              <Text>Platform</Text>
              <View style={styles.platformRow}>
                <TouchableOpacity
                  style={[
                    styles.platformBtn,
                    backfillPlatform === 'telegram' && styles.platformBtnActive,
                  ]}
                  onPress={() => setBackfillPlatform('telegram')}
                >
                  <Text style={styles.platformBtnText}>Telegram</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.platformBtn,
                    backfillPlatform === 'discord' && styles.platformBtnActive,
                  ]}
                  onPress={() => setBackfillPlatform('discord')}
                >
                  <Text style={styles.platformBtnText}>Discord</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text>Source (channel ID or @username)</Text>
              <TextInput
                style={styles.input}
                value={backfillSource}
                onChangeText={setBackfillSource}
                placeholder="e.g. -1001805766774 or @channelname"
              />
            </View>

            <View style={styles.formGroup}>
              <Text>Limit</Text>
              <TextInput
                style={styles.input}
                value={backfillLimit}
                onChangeText={setBackfillLimit}
                placeholder="100"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setShowBackfillModal(false)} />
              <Button
                title="Start Backfill"
                onPress={startBackfill}
                disabled={backfillLoading}
                color="#841584"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8,
  },
  list: { paddingBottom: 20 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'white', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  chatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  helperText: { color: '#666', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateButton: { backgroundColor: '#007AFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, marginRight: 8 },
  dateButtonText: { color: 'white', fontWeight: 'bold' },
  dateDisplay: { flex: 1, fontSize: 14, color: '#333' },
  // Backfill specific styles
  formGroup: { marginBottom: 16 },
  platformRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  platformBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
  },
  platformBtnActive: { backgroundColor: '#841584' },
  platformBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
});