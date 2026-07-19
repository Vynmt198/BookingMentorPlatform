import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatVnd } from '../config/paymentConfig';
import { resolveMediaUrl } from '../utils/mediaUrl';

function itemTypeLabel(type) {
  const raw = String(type || '').toLowerCase();
  if (raw === 'course') return 'Khóa học';
  if (raw === 'booking' || raw === 'mentor') return 'Buổi mentor';
  return type || 'Sản phẩm';
}

export default function CartScreen({
  cart,
  loading,
  topInset = 0,
  bottomPadding = 24,
  onBack,
  onRemove,
  onCheckout,
  onRefresh,
  onContinueShopping,
}) {
  const items = cart?.items || [];
  const total = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
    0,
  );

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: topInset }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color="#2D1B69" />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={styles.eyebrow}>THANH TOÁN</Text>
          <Text style={styles.topTitle}>Giỏ hàng ({items.length})</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} activeOpacity={0.85}>
          <Ionicons name="refresh" size={18} color="#8037f4" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#8037f4" size="large" />
          <Text style={styles.loadingText}>Đang tải giỏ hàng...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={42} color="#8037f4" />
          </View>
          <Text style={styles.emptyTitle}>Giỏ hàng đang trống</Text>
          <Text style={styles.emptySubtitle}>
            Thêm khóa học bạn quan tâm để thanh toán nhanh hơn.
          </Text>
          <TouchableOpacity style={styles.primaryCta} onPress={onContinueShopping} activeOpacity={0.9}>
            <Ionicons name="school-outline" size={16} color="#1a3300" />
            <Text style={styles.primaryCtaText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 140 }]}
          >
            {items.map((item) => {
              const thumb = resolveMediaUrl(item.thumbnail) || item.thumbnail;
              return (
                <View key={item._id} style={styles.itemCard}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="school" size={22} color="#8037f4" />
                    </View>
                  )}
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemType}>{itemTypeLabel(item.itemType)}</Text>
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemPrice}>{formatVnd(item.price)}</Text>
                      <Text style={styles.itemQty}>x{item.quantity || 1}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => onRemove(item._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(bottomPadding, 16) }]}>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalHint}>{items.length} sản phẩm</Text>
              </View>
              <Text style={styles.totalValue}>{formatVnd(total)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout} activeOpacity={0.9}>
              <Text style={styles.checkoutBtnText}>Thanh toán</Text>
              <Ionicons name="arrow-forward" size={18} color="#1a3300" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.continueLink} onPress={onContinueShopping}>
              <Text style={styles.continueLinkText}>Tiếp tục mua sắm</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f0fc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  topTitleWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8037f4',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D1B69',
  },
  refreshIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.14)',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D1B69',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#a3e635',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a3300',
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.12)',
    shadowColor: '#8037f4',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  thumbPlaceholder: {
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  itemType: {
    color: '#8037f4',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemPrice: {
    color: '#8037f4',
    fontWeight: '800',
    fontSize: 15,
  },
  itemQty: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(128,55,244,0.1)',
    gap: 10,
    shadowColor: '#8037f4',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  totalHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  totalValue: {
    color: '#8037f4',
    fontSize: 24,
    fontWeight: '900',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#a3e635',
    borderRadius: 16,
    paddingVertical: 15,
  },
  checkoutBtnText: {
    color: '#1a3300',
    fontSize: 16,
    fontWeight: '800',
  },
  continueLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  continueLinkText: {
    color: '#8037f4',
    fontSize: 13,
    fontWeight: '700',
  },
});
