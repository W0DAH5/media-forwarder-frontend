import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

let baseURL = '';

export const setBaseURL = (url) => { baseURL = url; };

export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const token = await AsyncStorage.getItem('web_ui_token');
  const url = `${baseURL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers['X-Forwarder-Token'] = token;
  const config = { method, url, headers };
  if (body) config.data = body;
  const response = await axios(config);
  return response.data;
};

// Helper to check if we can connect
export const testConnection = async (url, token) => {
  try {
    const response = await axios.get(`${url}/api/status`, {
      headers: { 'X-Forwarder-Token': token },
      timeout: 5000,
    });
    return response.data.ok === true;
  } catch {
    return false;
  }
};

// NEW: Fetch Telegram dialogs for source selection
export const getTelegramDialogs = async () => {
  const res = await apiCall('/api/discovery/telegram?limit=500');
  return res.items || [];
};