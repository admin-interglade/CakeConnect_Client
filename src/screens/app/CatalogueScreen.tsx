import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import { addToCart, type Product } from '../../store/ordersSlice';

const products: Product[] = [
  { id: '1', name: 'Classic Vanilla', category: 'Cakes', price: 520, unit: '1 kg' },
  { id: '2', name: 'Belgian Chocolate', category: 'Cakes', price: 680, unit: '1 kg' },
  { id: '3', name: 'Red Velvet Slice', category: 'Pastries', price: 110, unit: 'piece' },
  { id: '4', name: 'Butter Croissant', category: 'Pastries', price: 75, unit: 'piece' },
  { id: '5', name: 'Birthday Candle Set', category: 'Supplies', price: 90, unit: 'set' },
];
const categories = ['All', 'Cakes', 'Pastries', 'Supplies'];

export default function CatalogueScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const [category, setCategory] = useState('All');
  const visibleProducts = category === 'All' ? products : products.filter(item => item.category === category);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SHOP OWNER PORTAL</Text>
      <Text style={styles.title}>Catalogue</Text>
      <Text style={styles.subtitle}>Fresh stock, ready for your next order.</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={item => item}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <Pressable style={[styles.filter, category === item && styles.activeFilter]} onPress={() => setCategory(item)}>
            <Text style={[styles.filterText, category === item && styles.activeFilterText]}>{item}</Text>
          </Pressable>
        )}
      />
      <FlatList
        data={visibleProducts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.product}>
            <View style={styles.productIcon}><Text style={styles.iconText}>{item.name.charAt(0)}</Text></View>
            <View style={styles.productInfo}><Text style={styles.productName}>{item.name}</Text><Text style={styles.unit}>{item.category}  |  {item.unit}</Text></View>
            <View style={styles.action}><Text style={styles.price}>Rs {item.price}</Text><Pressable style={styles.addButton} onPress={() => dispatch(addToCart(item))}><Text style={styles.addText}>Add</Text></Pressable></View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0', paddingTop: 28 },
  eyebrow: { color: '#A85B3F', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginHorizontal: 22 },
  title: { color: '#2B2521', fontSize: 32, fontWeight: '800', marginHorizontal: 22, marginTop: 5 },
  subtitle: { color: '#7C716A', fontSize: 14, marginHorizontal: 22, marginTop: 4 },
  filters: { gap: 8, paddingHorizontal: 22, paddingVertical: 22 },
  filter: { borderColor: '#DED6CE', borderRadius: 18, borderWidth: 1, paddingHorizontal: 17, paddingVertical: 9 },
  activeFilter: { backgroundColor: '#A85B3F', borderColor: '#A85B3F' },
  filterText: { color: '#6D625C', fontWeight: '600' },
  activeFilterText: { color: '#FFF9F3' },
  list: { gap: 12, paddingBottom: 30, paddingHorizontal: 22 },
  product: { alignItems: 'center', backgroundColor: '#FFFDFC', borderRadius: 16, flexDirection: 'row', padding: 13 },
  productIcon: { alignItems: 'center', backgroundColor: '#F2D9C7', borderRadius: 13, height: 50, justifyContent: 'center', width: 50 },
  iconText: { color: '#A85B3F', fontSize: 22, fontWeight: '800' },
  productInfo: { flex: 1, marginLeft: 13 },
  productName: { color: '#2B2521', fontSize: 16, fontWeight: '700' },
  unit: { color: '#8C8179', fontSize: 12, marginTop: 4 },
  action: { alignItems: 'flex-end', gap: 8 },
  price: { color: '#2B2521', fontSize: 14, fontWeight: '800' },
  addButton: { backgroundColor: '#2B2521', borderRadius: 8, paddingHorizontal: 13, paddingVertical: 7 },
  addText: { color: '#FFF9F3', fontSize: 12, fontWeight: '700' },
});
