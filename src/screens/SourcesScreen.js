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

  // Discord multi‑add modal
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [discordIdsInput, setDiscordIdsInput] = useState('');
  const [discordStartDate, setDiscordStartDate] = useState('');
  const [discordMethod, setDiscordMethod] = useState('auto');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    loadSources();
    loadTelegramChats();
  }, []);

  const loadSources = async () => {
    const res = await apiCall('/api/sources');
    setSources(res.sources || []);
  };

  const loadTelegramChats = async () => {
    try {
      const items = await getTelegramDialogs();
      setTelegramChats(items);
    } catch (e) {
      Alert.alert('Error', 'Could not load Telegram chats');
    }
  };

  // ---------- Telegram multi‑add (FIXED: uses chat.id) ----------
  const toggleChatSelection = (id) => {
    setSelectedChats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addSelectedTelegramSources = async () => {
    const selectedIds = Object.keys(selectedChats).filter((id) => selectedChats[id]);
    if (selectedIds.length === 0) {
      Alert.alert('Select at least one chat');
      return;
    }
    setLoading(true);
    try {
      const sourcesToAdd = selectedIds.map((id) => {
        const chat = telegramChats.find((c) => c.id === id);
        return {
          platform: 'telegram',
          channel_id: chat.id,           // ✅ FIX: use numeric chat.id
          filters: { username: chat.username },
          forwarding_method: 'auto',
        };
      });
      for (const src of sourcesToAdd) {
        await apiCall('/api/sources', 'POST', src);
      }
      Alert.alert(`Added ${sourcesToAdd.length} sources`);
      setSelectedChats({});
      setShowChatPicker(false);
      loadSources();
    } catch (e) {
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
      loadSources();
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

  // ---------- Destination (FIXED: uses chat.id) ----------
  const setDestination = async () => {
    if (!selectedDest) {
      Alert.alert('Please select a destination');
      return;
    }
    try {
      await apiCall('/api/destination', 'POST', { channel_id: selectedDest }); // ✅ FIX: numeric chat.id
      Alert.alert('Destination updated');
      setShowDestPicker(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const renderSource = ({ item }) => (
    <SourceCard
      source={item}
      onToggle={async (id, enable) => {
        await apiCall(`/api/sources/${id}/${enable ? 'enable' : 'disable'}`, 'POST');
        loadSources();
      }}
      onRemove={async (id) => {
        Alert.alert('Confirm', 'Remove source?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await apiCall(`/api/sources/${id}`, 'DELETE');
              loadSources();
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
      </View>

      <FlatList
        data={sources}
        keyExtractor={(item) => item.channel_id}
        renderItem={renderSource}
        ListEmptyComponent={<Text style={styles.empty}>No sources. Add Telegram chats or Discord channels above.</Text>}
        contentContainerStyle={styles.list}
      />

      {/* ---------- Telegram Chat Picker Modal ---------- */}
      <Modal visible={showChatPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Telegram Chats</Text>
            <ScrollView>
              {telegramChats.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  onPress={() => toggleChatSelection(chat.id)}
                  style={styles.chatItem}
                >
                  <Text>
                    {chat.name} {chat.username ? `(@${chat.username})` : ''}
                  </Text>
                  <Text>{selectedChats[chat.id] ? '✅' : '⬜'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setShowChatPicker(false)} />
              <Button title="Add Selected" onPress={addSelectedTelegramSources} disabled={loading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Discord Multi‑Add Modal ---------- */}
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

      {/* ---------- Destination Picker Modal ---------- */}
      <Modal visible={showDestPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Set Destination Channel</Text>
            <ScrollView>
              {telegramChats.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  onPress={() => setSelectedDest(chat.id)}   // ✅ FIX: use chat.id
                  style={styles.chatItem}
                >
                  <Text>
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
});