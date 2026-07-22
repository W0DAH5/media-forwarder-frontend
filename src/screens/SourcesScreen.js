import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Button, Modal, ScrollView } from 'react-native';
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

  const toggleChatSelection = (id) => {
    setSelectedChats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addSelectedTelegramSources = async () => {
    const selectedIds = Object.keys(selectedChats).filter(id => selectedChats[id]);
    if (selectedIds.length === 0) {
      Alert.alert('Select at least one chat');
      return;
    }
    setLoading(true);
    try {
      const sourcesToAdd = selectedIds.map(id => {
        const chat = telegramChats.find(c => c.id === id);
        return {
          platform: 'telegram',
          channel_id: chat.input,
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

  const setDestination = async () => {
    if (!selectedDest) {
      Alert.alert('Please select a destination');
      return;
    }
    try {
      await apiCall('/api/destination', 'POST', { channel_id: selectedDest });
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
          { text: 'Remove', style: 'destructive', onPress: async () => {
            await apiCall(`/api/sources/${id}`, 'DELETE');
            loadSources();
          }},
        ]);
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerButtons}>
        <Button title="➕ Add Telegram Chats" onPress={() => setShowChatPicker(true)} />
        <Button title="📌 Set Destination" onPress={() => setShowDestPicker(true)} />
      </View>
      <FlatList
        data={sources}
        keyExtractor={(item) => item.channel_id}
        renderItem={renderSource}
        ListEmptyComponent={<Text style={styles.empty}>No sources. Add Telegram chats above.</Text>}
        contentContainerStyle={styles.list}
      />

      {/* Telegram Chat Picker Modal */}
      <Modal visible={showChatPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Telegram Chats</Text>
            <ScrollView>
              {telegramChats.map(chat => (
                <TouchableOpacity key={chat.id} onPress={() => toggleChatSelection(chat.id)} style={styles.chatItem}>
                  <Text>{chat.name} {chat.username ? `(@${chat.username})` : ''}</Text>
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

      {/* Destination Picker Modal */}
      <Modal visible={showDestPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Set Destination Channel</Text>
            <ScrollView>
              {telegramChats.map(chat => (
                <TouchableOpacity key={chat.id} onPress={() => setSelectedDest(chat.input)} style={styles.chatItem}>
                  <Text>{chat.name} {chat.username ? `(@${chat.username})` : ''}</Text>
                  <Text>{selectedDest === chat.input ? '✅' : ''}</Text>
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
  headerButtons: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  list: { paddingBottom: 20 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'white', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  chatItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
});