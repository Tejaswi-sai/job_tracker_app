/**
 * Job Application Tracker
 * A simple React Native app to log and track job applications:
 * company, role, status, date applied, and notes.
 *
 * Stack: React Native (Expo) + Firebase Firestore for cloud persistence
 * (real-time sync via onSnapshot — no manual save/load needed).
 * Author: Tejaswi Sai Gadadasu
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebaseConfig';

const APPLICATIONS_COLLECTION = 'applications';
const STATUS_OPTIONS = ['Applied', 'Interview', 'Offer', 'Rejected'];

const emptyForm = {
  company: '',
  role: '',
  status: 'Applied',
  dateApplied: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function App() {
  const [applications, setApplications] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Silently sign in anonymously on launch. This gives the app a valid
  // request.auth for Firestore's security rules to check, with no login
  // screen ever shown to the user.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthReady(true);
      } else {
        signInAnonymously(auth).catch((e) => {
          console.warn('Anonymous sign-in failed', e);
          setSyncError('Unable to authenticate with the server.');
          setLoading(false);
        });
      }
    });
    return unsubscribeAuth;
  }, []);

  // Subscribe to Firestore in real time, but only once auth is ready —
  // otherwise the very first read would be rejected by security rules
  // that require request.auth != null. This replaces the old
  // load-once-on-mount + save-on-every-change AsyncStorage pattern.
  useEffect(() => {
    if (!authReady) return;

    const q = query(collection(db, APPLICATIONS_COLLECTION), orderBy('dateApplied', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setApplications(docs);
        setLoading(false);
        setSyncError(null);
      },
      (error) => {
        console.warn('Firestore sync failed', error);
        setSyncError('Unable to sync with the server. Check your connection.');
        setLoading(false);
      }
    );
    // Unsubscribe when the component unmounts, so we don't leak a
    // live listener after the app is closed.
    return unsubscribe;
  }, [authReady]);

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((item) => {
    setEditingId(item.id);
    setForm(item);
    setModalVisible(true);
  }, []);

  const saveApplication = useCallback(async () => {
    if (!form.company.trim() || !form.role.trim()) {
      Alert.alert('Missing info', 'Company and role are required.');
      return;
    }
    // Strip the local 'id' field before writing — Firestore manages
    // document ids itself, so we never want to write our own into the
    // document body (it'd just be a leftover, unused field there).
    const { id, ...formData } = form;

    try {
      if (editingId) {
        await updateDoc(doc(db, APPLICATIONS_COLLECTION, editingId), formData);
      } else {
        await addDoc(collection(db, APPLICATIONS_COLLECTION), formData);
      }
      setModalVisible(false);
      // No local state update needed here — the onSnapshot listener
      // above will pick up this change automatically and re-render.
    } catch (e) {
      console.warn('Failed to save application', e);
      Alert.alert('Save failed', 'Could not save to the server. Please try again.');
    }
  }, [form, editingId]);

  const deleteApplication = useCallback((id) => {
    Alert.alert('Delete entry', 'Remove this application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, APPLICATIONS_COLLECTION, id));
          } catch (e) {
            console.warn('Failed to delete application', e);
            Alert.alert('Delete failed', 'Could not delete from the server. Please try again.');
          }
        },
      },
    ]);
  }, []);

  const onDateChange = useCallback((event, selectedDate) => {
    // Android closes the picker after one tap; iOS keeps it open until Done, so
    // only auto-hide on Android.
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setForm((f) => ({ ...f, dateApplied: selectedDate.toISOString().slice(0, 10) }));
    }
  }, []);

  const onDatePickerDismiss = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <Text style={styles.company}>{item.company}</Text>
          <Text style={[styles.status, styles[`status_${item.status}`]]}>{item.status}</Text>
        </View>
        <Text style={styles.role}>{item.role}</Text>
        <Text style={styles.date}>Applied: {item.dateApplied}</Text>
        {!!item.notes && <Text style={styles.notes}>{item.notes}</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => deleteApplication(item.id)}
        style={styles.deleteButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteLink}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Job Application Tracker</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {!!syncError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{syncError}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2F6FED" size="large" />
          <Text style={styles.loadingText}>Syncing with the server...</Text>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No applications logged yet. Tap "+ Add" to start.</Text>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Application' : 'New Application'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Company"
                value={form.company}
                onChangeText={(t) => setForm((f) => ({ ...f, company: t }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Role"
                value={form.role}
                onChangeText={(t) => setForm((f) => ({ ...f, role: t }))}
              />
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={form.dateApplied ? styles.dateValue : styles.dateValuePlaceholder}>
                  {form.dateApplied || 'Select date applied'}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={form.dateApplied ? new Date(form.dateApplied) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  onValueChange={onDateChange}
                  onDismiss={onDatePickerDismiss}
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.dateDoneBtn}
                >
                  <Text style={styles.dateDoneText}>Done</Text>
                </TouchableOpacity>
              )}

              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusChip, form.status === s && styles.statusChipActive]}
                    onPress={() => setForm((f) => ({ ...f, status: s }))}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        form.status === s && styles.statusChipTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notes (recruiter, next step, link...)"
                value={form.notes}
                onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveApplication} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', paddingTop: Platform.OS === 'android' ? 24 : 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2430' },
  addButton: { backgroundColor: '#2F6FED', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  company: { fontSize: 16, fontWeight: '700', color: '#1F2430' },
  role: { fontSize: 14, color: '#3C4257', marginTop: 2 },
  date: { fontSize: 12, color: '#8A8F9C', marginTop: 4 },
  notes: { fontSize: 12, color: '#5A6072', marginTop: 6, fontStyle: 'italic' },
  status: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  status_Applied: { backgroundColor: '#E3ECFF', color: '#2F6FED' },
  status_Interview: { backgroundColor: '#FFF4D9', color: '#B5860B' },
  status_Offer: { backgroundColor: '#E1F7E8', color: '#1E8E4C' },
  status_Rejected: { backgroundColor: '#FDE7E7', color: '#C0392B' },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
  deleteLink: { color: '#C0392B', fontSize: 12, fontWeight: '600' },
  dateValue: { fontSize: 14, color: '#1F2430' },
  dateValuePlaceholder: { fontSize: 14, color: '#8A8F9C' },
  dateDoneBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4, marginBottom: 6 },
  dateDoneText: { color: '#2F6FED', fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', color: '#8A8F9C', marginTop: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#8A8F9C', fontSize: 13 },
  errorBanner: {
    backgroundColor: '#FDE7E7',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },
  errorBannerText: { color: '#C0392B', fontSize: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1F2430' },
  input: {
    borderWidth: 1,
    borderColor: '#E1E4EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  notesInput: { height: 70, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  statusChip: {
    borderWidth: 1,
    borderColor: '#E1E4EA',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  statusChipActive: { backgroundColor: '#2F6FED', borderColor: '#2F6FED' },
  statusChipText: { fontSize: 12, color: '#3C4257' },
  statusChipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 },
  cancelBtnText: { color: '#5A6072', fontWeight: '600' },
  saveBtn: { backgroundColor: '#2F6FED', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});

