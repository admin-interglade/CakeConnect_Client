import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { submitOrder, updateQuantity } from '../../store/ordersSlice';

export default function CartScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const cart = useSelector((state: RootState) => state.orders.cart);
  const [seconds, setSeconds] = useState(14 * 60 + 32);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(value => (value > 0 ? value - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const placeOrder = () => {
    if (!cart.length) return;
    dispatch(submitOrder());
    Alert.alert('Draft submitted', 'Your order is saved and ready to sync when online.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>ORDER DESK</Text><Text style={styles.title}>Your cart</Text>
      <View style={styles.timer}><Text style={styles.timerLabel}>Today&apos;s cut-off</Text><Text style={styles.timerValue}>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</Text></View>
      {!cart.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>Your cart is empty</Text><Text style={styles.emptyText}>Add products from the Catalogue tab to create a draft order.</Text></View> : cart.map(item => (
        <View style={styles.row} key={item.id}><View style={styles.itemInfo}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemPrice}>Rs {item.price} / {item.unit}</Text></View><View style={styles.controls}><Pressable style={styles.stepper} onPress={() => dispatch(updateQuantity({ productId: item.id, quantity: item.quantity - 1 }))}><Text style={styles.step}>-</Text></Pressable><Text style={styles.quantity}>{item.quantity}</Text><Pressable style={styles.stepper} onPress={() => dispatch(updateQuantity({ productId: item.id, quantity: item.quantity + 1 }))}><Text style={styles.step}>+</Text></Pressable></View></View>
      ))}
      <View style={styles.totalRow}><Text style={styles.totalLabel}>Order total</Text><Text style={styles.total}>Rs {total}</Text></View>
      <Pressable style={[styles.submit, !cart.length && styles.disabled]} onPress={placeOrder}><Text style={styles.submitText}>Save draft order</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { backgroundColor: '#F8F5F0', flexGrow: 1, padding: 22, paddingTop: 28 }, eyebrow: { color: '#A85B3F', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }, title: { color: '#2B2521', fontSize: 32, fontWeight: '800', marginTop: 5 }, timer: { alignItems: 'center', backgroundColor: '#2B2521', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, padding: 17 }, timerLabel: { color: '#E9DCCF', fontSize: 13 }, timerValue: { color: '#FFF9F3', fontSize: 22, fontWeight: '800' }, empty: { alignItems: 'center', paddingVertical: 70 }, emptyTitle: { color: '#2B2521', fontSize: 19, fontWeight: '800' }, emptyText: { color: '#82766E', fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 270, textAlign: 'center' }, row: { alignItems: 'center', backgroundColor: '#FFFDFC', borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, padding: 16 }, itemInfo: { flex: 1 }, itemName: { color: '#2B2521', fontSize: 15, fontWeight: '700' }, itemPrice: { color: '#8C8179', fontSize: 12, marginTop: 5 }, controls: { alignItems: 'center', flexDirection: 'row', gap: 11 }, stepper: { alignItems: 'center', backgroundColor: '#F2D9C7', borderRadius: 8, height: 30, justifyContent: 'center', width: 30 }, step: { color: '#A85B3F', fontSize: 20, lineHeight: 22 }, quantity: { color: '#2B2521', fontWeight: '800' }, totalRow: { borderTopColor: '#DED6CE', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingTop: 19 }, totalLabel: { color: '#6D625C', fontSize: 16 }, total: { color: '#2B2521', fontSize: 21, fontWeight: '800' }, submit: { alignItems: 'center', backgroundColor: '#A85B3F', borderRadius: 12, marginTop: 18, padding: 16 }, disabled: { opacity: 0.45 }, submitText: { color: '#FFF9F3', fontSize: 15, fontWeight: '800' },
});
