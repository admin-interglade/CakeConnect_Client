import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<'shopOwner' | 'admin'>('shopOwner');

  return (
    <SafeAreaView style={styles.safe}><View style={styles.container}>
      <Text style={styles.kicker}>CAKECONNECT</Text><Text style={styles.title}>Welcome back.</Text><Text style={styles.subtitle}>Manage your bakery orders with calm, clear control.</Text>
      <Text style={styles.label}>Email or phone</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="you@bakery.com" placeholderTextColor="#A79A91" style={styles.input} value={identifier} onChangeText={setIdentifier} />
      <Text style={styles.label}>Password</Text><TextInput placeholder="Enter your password" placeholderTextColor="#A79A91" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
      <View style={styles.roleHeader}><Text style={styles.label}>Continue as</Text><Text style={styles.flag}>DEMO FLAG</Text></View><View style={styles.roles}>
        <Pressable style={[styles.role, role === 'shopOwner' && styles.selectedRole]} onPress={() => setRole('shopOwner')}><Text style={[styles.roleText, role === 'shopOwner' && styles.selectedRoleText]}>Shop owner</Text></Pressable>
        <Pressable style={[styles.role, role === 'admin' && styles.selectedRole]} onPress={() => setRole('admin')}><Text style={[styles.roleText, role === 'admin' && styles.selectedRoleText]}>Admin</Text></Pressable>
      </View><Pressable style={styles.button} onPress={() => navigation.navigate('OTP', { phone: identifier || '+91 99999 99999', role })}><Text style={styles.buttonText}>Continue to verification</Text></Pressable><Text style={styles.note}>Backend authentication will connect here later.</Text>
    </View></SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { backgroundColor: '#F8F5F0', flex: 1 }, container: { flex: 1, justifyContent: 'center', padding: 28 }, kicker: { color: '#A85B3F', fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: '#2B2521', fontSize: 38, fontWeight: '800', marginTop: 12 }, subtitle: { color: '#7C716A', fontSize: 15, lineHeight: 22, marginBottom: 34, marginTop: 8 }, label: { color: '#4A403A', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 17 }, input: { backgroundColor: '#FFFDFC', borderColor: '#E3DAD1', borderRadius: 12, borderWidth: 1, color: '#2B2521', fontSize: 15, padding: 15 }, roleHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, flag: { backgroundColor: '#F2D9C7', borderRadius: 5, color: '#A85B3F', fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 4 }, roles: { flexDirection: 'row', gap: 10 }, role: { borderColor: '#DED6CE', borderRadius: 10, borderWidth: 1, flex: 1, padding: 13 }, selectedRole: { backgroundColor: '#2B2521', borderColor: '#2B2521' }, roleText: { color: '#6D625C', textAlign: 'center' }, selectedRoleText: { color: '#FFF9F3', fontWeight: '700' }, button: { alignItems: 'center', backgroundColor: '#A85B3F', borderRadius: 12, marginTop: 26, padding: 16 }, buttonText: { color: '#FFF9F3', fontSize: 15, fontWeight: '800' }, note: { color: '#9A8D84', fontSize: 12, marginTop: 14, textAlign: 'center' },
});
