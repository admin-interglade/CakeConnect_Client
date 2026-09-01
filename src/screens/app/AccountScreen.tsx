import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { logout } from '../../store/authSlice';

export default function AccountScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  return (
    <View style={styles.container}><Text style={styles.eyebrow}>PROFILE</Text><Text style={styles.title}>Account</Text><View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0) || 'C'}</Text></View><Text style={styles.name}>{user?.name || 'CakeConnect user'}</Text><Text style={styles.role}>{user?.role === 'admin' ? 'Administrator' : 'Shop owner'}</Text></View><View style={styles.item}><Text style={styles.itemLabel}>Signed in with</Text><Text style={styles.itemValue}>{user?.phone}</Text></View><Pressable style={styles.logout} onPress={() => dispatch(logout())}><Text style={styles.logoutText}>Sign out</Text></Pressable></View>
  );
}
const styles = StyleSheet.create({ container: { backgroundColor: '#F8F5F0', flex: 1, padding: 22, paddingTop: 30 }, eyebrow: { color: '#A85B3F', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#2B2521', fontSize: 32, fontWeight: '800', marginTop: 5 }, profile: { alignItems: 'center', backgroundColor: '#FFFDFC', borderRadius: 17, marginTop: 25, padding: 24 }, avatar: { alignItems: 'center', backgroundColor: '#F2D9C7', borderRadius: 35, height: 70, justifyContent: 'center', width: 70 }, avatarText: { color: '#A85B3F', fontSize: 28, fontWeight: '800' }, name: { color: '#2B2521', fontSize: 19, fontWeight: '800', marginTop: 13 }, role: { color: '#8C8179', marginTop: 4 }, item: { backgroundColor: '#FFFDFC', borderRadius: 13, marginTop: 12, padding: 17 }, itemLabel: { color: '#8C8179', fontSize: 12 }, itemValue: { color: '#3D332E', fontWeight: '700', marginTop: 6 }, logout: { alignItems: 'center', borderColor: '#D9B5A2', borderRadius: 12, borderWidth: 1, marginTop: 25, padding: 15 }, logoutText: { color: '#A85B3F', fontWeight: '800' }, });
