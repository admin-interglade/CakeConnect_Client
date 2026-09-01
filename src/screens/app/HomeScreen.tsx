import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

export default function HomeScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const lastOrderTotal = useSelector((state: RootState) => state.orders.lastOrderTotal);
  return (
    <ScrollView contentContainerStyle={styles.container}><Text style={styles.kicker}>TUESDAY, 01 SEPTEMBER</Text><Text style={styles.title}>Good morning, {user?.name || 'partner'}.</Text><Text style={styles.subtitle}>Here&apos;s the pulse of your bakery today.</Text><View style={styles.hero}><Text style={styles.heroLabel}>TODAY&apos;S ORDERS</Text><Text style={styles.heroValue}>24</Text><Text style={styles.heroNote}>+12% from yesterday</Text></View><View style={styles.grid}><Stat label="Yesterday's status" value="18 delivered" /><Stat label="Outstanding balance" value="Rs 8,420" /></View><Text style={styles.section}>Recent transactions</Text>{['Order #CC-1042  •  Rs 2,480', 'Order #CC-1039  •  Rs 1,920', lastOrderTotal ? `Draft order  •  Rs ${lastOrderTotal}` : 'Payout received  •  Rs 4,200'].map(item => <View style={styles.transaction} key={item}><View style={styles.dot} /><Text style={styles.transactionText}>{item}</Text><Text style={styles.chevron}>›</Text></View>)}</ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ container: { backgroundColor: '#F8F5F0', flexGrow: 1, padding: 22, paddingTop: 30 }, kicker: { color: '#A85B3F', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#2B2521', fontSize: 29, fontWeight: '800', marginTop: 7 }, subtitle: { color: '#7C716A', fontSize: 14, marginTop: 5 }, hero: { backgroundColor: '#2B2521', borderRadius: 18, marginTop: 25, padding: 20 }, heroLabel: { color: '#E9DCCF', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 }, heroValue: { color: '#FFF9F3', fontSize: 46, fontWeight: '800', marginTop: 4 }, heroNote: { color: '#C9A889', fontSize: 13 }, grid: { flexDirection: 'row', gap: 12, marginTop: 12 }, stat: { backgroundColor: '#FFFDFC', borderRadius: 15, flex: 1, padding: 16 }, statLabel: { color: '#8C8179', fontSize: 12, lineHeight: 17 }, statValue: { color: '#2B2521', fontSize: 16, fontWeight: '800', marginTop: 12 }, section: { color: '#2B2521', fontSize: 18, fontWeight: '800', marginBottom: 12, marginTop: 28 }, transaction: { alignItems: 'center', backgroundColor: '#FFFDFC', borderRadius: 13, flexDirection: 'row', marginBottom: 9, padding: 15 }, dot: { backgroundColor: '#D98C62', borderRadius: 5, height: 10, width: 10 }, transactionText: { color: '#4A403A', flex: 1, fontSize: 13, marginLeft: 11 }, chevron: { color: '#A85B3F', fontSize: 23 }, });
