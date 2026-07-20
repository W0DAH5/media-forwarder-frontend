import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Button, TextInput, Modal } from 'react-native';
import { apiCall } from '../api/client';
import SourceCard from '../components/SourceCard';

export default function SourcesScreen({ navigation }) {
  const [sources, setSources] = useState([]);
  const [tgSuggestions, setTgSuggestions] = useState([]);
  const [dcSuggestions, setDcSuggestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newSource, setNewSource] = useState({ platform: 'telegram', channel: '', filters: '{}', start_date: '' });

  const loadSources = async () => {
    const res = await apiCall('/api/sources');
    setSources(res.sources || []);
  };

  const loadSuggestions = async () => {
    const tg = await apiCall('/api/discovery/telegram?limit=200');
    setTgSuggestions(tg.items || []);
    const dc = await apiCall('/api/discovery/discord');
    setDcSuggestions(dc.items || []);
  };

  useEffect(() => {
    loadSources();
    loadSuggestions();
  }, []);

  const addSource = async () => {
    try {
      const filters = JSON.parse(newSource.filters);
      await apiCall('/api/sources', 'POST', {
        platform: newSource.platform,
        channel: newSource.channel,
        filters,
        start_date: newSource.start_date || null,
      });
      Alert.alert('Success', 'Source added');
      setShowModal(false);
      loadSources();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const renderItem = ({ item }) => (
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
      <Button title="➕ Add Source" onPress={() => setShowModal(true)} />
      <FlatList
        data={sources}
        keyExtractor={(item) => item.channel_id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No sources. Add one.</Text>}
        contentContainerStyle={styles.list}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Source</Text>
            <TextInput
              style={styles.input}
              placeholder="Platform (telegram/discord)"
              value={newSource.platform}
              onChangeText={(t) => setNewSource({ ...newSource, platform: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Channel ID or @username"
              value={newSource.channel}
              onChangeText={(t) => setNewSource({ ...newSource, channel: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Start Date (YYYY-MM-DD) optional"
              value={newSource.start_date}
              onChangeText={(t) => setNewSource({ ...newSource, start_date: t })}
            />
            <TextInput
              style={styles.input}
              placeholder='Filters JSON (e.g., {"forwarding_method":"auto"})'
              value={newSource.filters}
              onChangeText={(t) => setNewSource({ ...newSource, filters: t })}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setShowModal(false)} />
              <Button title="Add" onPress={addSource} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  list: { paddingBottom: 20 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: 'white', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
});