import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import { setCredentials } from '../../store/authSlice';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'OTP'>;

export default function OTPScreen({ route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [otp, setOtp] = React.useState('');
  const verify = () => dispatch(setCredentials({ token: 'demo-token', user: { id: 'demo-user', phone: route.params.phone, role: route.params.role, name: route.params.role === 'shopOwner' ? 'Aarav Bakery' : 'CakeConnect Admin' } }));
  return (
    <SafeAreaView style={styles.safe}><View style={styles.container}><Text style={styles.kicker}>SECURE SIGN IN</Text><Text style={styles.title}>Check your code.</Text><Text style={styles.subtitle}>We sent a six-digit code to {route.params.phone}.</Text><TextInput autoFocus keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor="#A79A91" style={styles.otp} value={otp} onChangeText={setOtp} /><Pressable style={styles.button} onPress={verify}><Text style={styles.buttonText}>Verify and open dashboard</Text></Pressable><Text style={styles.resend}>Didn&apos;t receive it? Resend code</Text></View></SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { backgroundColor: '#F8F5F0', flex: 1 }, container: { flex: 1, justifyContent: 'center', padding: 28 }, kicker: { color: '#A85B3F', fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: '#2B2521', fontSize: 36, fontWeight: '800', marginTop: 12 }, subtitle: { color: '#7C716A', fontSize: 15, lineHeight: 22, marginTop: 9 }, otp: { backgroundColor: '#FFFDFC', borderColor: '#E3DAD1', borderRadius: 12, borderWidth: 1, color: '#2B2521', fontSize: 28, letterSpacing: 8, marginTop: 30, padding: 14, textAlign: 'center' }, button: { alignItems: 'center', backgroundColor: '#A85B3F', borderRadius: 12, marginTop: 18, padding: 16 }, buttonText: { color: '#FFF9F3', fontSize: 15, fontWeight: '800' }, resend: { color: '#A85B3F', fontSize: 13, marginTop: 18, textAlign: 'center' },
});
