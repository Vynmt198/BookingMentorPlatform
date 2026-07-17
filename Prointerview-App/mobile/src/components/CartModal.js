import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatVnd } from '../config/paymentConfig';

export default function CartModal({
  visible,
  onClose,
  cart,
  loading,
  onRemove,
  onCheckout,
  onRefresh,
}) {
  const items = cart?.items || [];
  const total = items.reduce((t, i) => t + (Number(i.price) || 0) * (i.quantity || 1), 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="cart" size={22} color="#93f72b" />
              <Text style={styles.title}>Giỏ hàng ({items.length})</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#7000ff" size="large" />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="cart-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>Giỏ hàng đang trống</Text>
              <TouchableOpacity style={styles.continueBtn} onPress={onClose}>
                <Text style={styles.continueBtnText}>Tiếp tục mua sắm</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                {items.map((item) => (
                  <View key={item._id} style={styles.itemRow}>
                    {item.thumbnail ? (
                      <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Ionicons name="school" size={20} color="#94a3b8" />
                      </View>
                    )}
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.itemType}>{item.itemType}</Text>
                      <View style={styles.itemFooter}>
                        <Text style={styles.itemPrice}>{formatVnd(item.price)}</Text>
                        <Text style={styles.itemQty}>x{item.quantity || 1}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => onRemove(item._id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tổng cộng</Text>
                  <Text style={styles.totalValue}>{formatVnd(total)}</Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout}>
                  <Text style={styles.checkoutBtnText}>Thanh toán</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0f172a" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                  <Text style={styles.refreshBtnText}>Làm mới giỏ hàng</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  continueBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(147,247,43,0.4)',
  },
  continueBtnText: { color: '#93f72b', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.2)',
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  itemType: { color: '#64748b', fontSize: 11, marginTop: 2 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  itemPrice: { color: '#93f72b', fontWeight: '700', fontSize: 14 },
  itemQty: { color: '#94a3b8', fontSize: 13 },
  removeBtn: { padding: 4, alignSelf: 'flex-start' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#94a3b8', fontSize: 15 },
  totalValue: { color: '#93f72b', fontSize: 20, fontWeight: '800' },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#93f72b',
    borderRadius: 999,
    paddingVertical: 14,
  },
  checkoutBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  refreshBtn: { alignItems: 'center', paddingVertical: 6 },
  refreshBtnText: { color: '#64748b', fontSize: 13 },
});
