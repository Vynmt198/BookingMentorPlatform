import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { mentorApi } from '../services/roleApi';
import { uploadMeetingCheckinImage } from '../services/uploadApi';
import { authFetch } from '../utils/mobileAuth';

function buildMeetingHtml(meeting) {
  const domain = meeting?.domain || '8x8.vc';
  const room = meeting?.fullRoomName || meeting?.roomName || '';
  const jwt = meeting?.jwt || '';
  const displayName = meeting?.displayName || 'ProInterview';
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<script src="https://${domain}/external_api.js"></script>
<style>html,body,#root{margin:0;height:100%;background:#0f172a;color:#fff;font-family:sans-serif}</style>
</head><body><div id="root">Đang vào phòng...</div>
<script>
(function(){
  var domain=${JSON.stringify(domain)};
  var room=${JSON.stringify(room)};
  var jwt=${JSON.stringify(jwt)};
  var options={roomName:room,width:'100%',height:'100%',parentNode:document.getElementById('root'),userInfo:{displayName:${JSON.stringify(displayName)}}};
  if(jwt) options.jwt=jwt;
  try { new JitsiMeetExternalAPI(domain, options); }
  catch(e){ document.getElementById('root').textContent='Không khởi tạo được phòng họp: '+e.message; }
})();
</script></body></html>`;
}

function publicMeetUrl(bookingId) {
  return `https://meet.jit.si/ProInterview-${String(bookingId || '').replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * Phòng họp in-app: mentor check-in → start → WebView JaaS/Jitsi.
 * asMentor=false: customer chỉ start + join.
 */
export default function MeetingRoomScreen({
  bookingId,
  booking: initialBooking,
  asMentor = false,
  user,
  onBack,
  onBookingUpdated,
}) {
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState(initialBooking || null);
  const [phase, setPhase] = useState(
    asMentor && !initialBooking?.mentorCheckInAt ? 'checkin' : 'ready',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewUri, setPreviewUri] = useState('');
  const [meeting, setMeeting] = useState(null);

  const title = useMemo(() => {
    if (phase === 'live') return 'Phòng họp';
    if (phase === 'checkin') return 'Check-in buổi họp';
    return 'Vào phòng họp';
  }, [phase]);

  const notify = (msg) => setError(msg || '');

  const pickCheckIn = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      notify('Cần quyền camera để check-in.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPreviewUri(result.assets[0].uri);
    setError('');
  }, []);

  const submitCheckIn = useCallback(async () => {
    if (!previewUri) {
      notify('Chụp ảnh check-in trước.');
      return;
    }
    setBusy(true);
    setError('');
    const uploaded = await uploadMeetingCheckinImage({
      uri: previewUri,
      mimeType: 'image/jpeg',
      fileName: `checkin-${Date.now()}.jpg`,
    });
    if (!uploaded.success) {
      setBusy(false);
      notify(uploaded.error || 'Upload ảnh thất bại.');
      return;
    }
    const res = await mentorApi.submitCheckIn(bookingId, uploaded.url || uploaded.absoluteUrl);
    setBusy(false);
    if (!res.success) {
      notify(res.error || 'Check-in thất bại.');
      return;
    }
    setBooking(res.booking);
    onBookingUpdated?.(res.booking);
    setPhase('ready');
  }, [bookingId, onBookingUpdated, previewUri]);

  const enterRoom = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      let res;
      if (asMentor) {
        res = await mentorApi.startBooking(bookingId);
      } else {
        const r = await authFetch(`/api/bookings/${encodeURIComponent(bookingId)}/start`, {
          method: 'PATCH',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: '{}',
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok || !body.success) {
          res = { success: false, error: body.error || `Lỗi ${r.status}` };
        } else {
          res = { success: true, booking: body.booking, meeting: body.meeting };
        }
      }
      if (!res.success) {
        if (res.status === 403 || /check-in/i.test(res.error || '')) {
          setPhase('checkin');
        }
        setBusy(false);
        notify(res.error || 'Không vào được phòng.');
        return;
      }
      if (res.booking) {
        setBooking(res.booking);
        onBookingUpdated?.(res.booking);
      }
      const m = res.meeting || { provider: 'jitsi_public' };
      if (user?.name) m.displayName = user.name;
      setMeeting(m);
      setPhase('live');
    } catch {
      notify('Không kết nối được backend.');
    }
    setBusy(false);
  }, [asMentor, bookingId, onBookingUpdated, user?.name]);

  const html = useMemo(() => {
    if (!meeting || meeting.provider !== 'jaas' || !meeting.jwt) return '';
    return buildMeetingHtml(meeting);
  }, [meeting]);

  const fallbackUrl = useMemo(() => {
    if (meeting?.provider === 'jaas' && meeting.jwt) return '';
    if (booking?.meetingLink) return String(booking.meetingLink);
    return publicMeetUrl(bookingId);
  }, [booking?.meetingLink, bookingId, meeting]);

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#2D1B69" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {phase === 'checkin' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Check-in trước khi vào phòng</Text>
          <Text style={styles.cardSub}>Chụp ảnh khuôn mặt để xác nhận mentor có mặt.</Text>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.preview} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#8037f4" />
            </View>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickCheckIn} disabled={busy}>
            <Text style={styles.secondaryBtnText}>{previewUri ? 'Chụp lại' : 'Mở camera'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={submitCheckIn} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Xác nhận check-in</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'ready' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sẵn sàng vào phòng</Text>
          <Text style={styles.cardSub}>
            {booking?.date || '—'} · {booking?.timeSlot || '—'}
            {booking?.customerName ? ` · ${booking.customerName}` : ''}
            {booking?.mentorName ? ` · ${booking.mentorName}` : ''}
          </Text>
          {asMentor && booking?.mentorCheckInAt ? (
            <Text style={styles.okHint}>Đã check-in ✓</Text>
          ) : null}
          <TouchableOpacity style={styles.primaryBtn} onPress={enterRoom} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Vào phòng họp</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'live' ? (
        <View style={styles.liveWrap}>
          {html ? (
            <WebView
              originWhitelist={['*']}
              source={{ html, baseUrl: `https://${meeting?.domain || '8x8.vc'}` }}
              style={styles.webview}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              mediaCapturePermissionGrantType="grant"
              allowsFullscreenVideo
            />
          ) : (
            <WebView
              source={{ uri: fallbackUrl }}
              style={styles.webview}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f6f3ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#2D1B69' },
  error: { marginHorizontal: 16, marginBottom: 8, color: '#b91c1c', fontWeight: '600' },
  card: {
    margin: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#fff',
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#2D1B69' },
  cardSub: { fontSize: 13, color: 'rgba(45,27,105,0.65)', lineHeight: 18 },
  okHint: { color: '#15803d', fontWeight: '700' },
  preview: { width: '100%', height: 240, borderRadius: 14, backgroundColor: '#eee' },
  previewPlaceholder: {
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,55,244,0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,55,244,0.04)',
  },
  primaryBtn: {
    backgroundColor: '#8037f4',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(128,55,244,0.1)',
  },
  secondaryBtnText: { color: '#8037f4', fontWeight: '700' },
  liveWrap: { flex: 1, marginTop: 4 },
  webview: { flex: 1, backgroundColor: '#0f172a' },
});
