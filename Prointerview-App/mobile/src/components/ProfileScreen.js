import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { patchCurrentUser } from '../utils/mobileAuth';
import { uploadAvatarImage } from '../services/uploadApi';
import { resolveMediaUrl } from '../utils/mediaUrl';
import {
  applyAsMentor,
  buildMentorApplyPayload,
  buildMentorUpdatePayload,
  buildUserProfilePayload,
  fetchMyMentorProfile,
  updateMyMentorProfile,
} from '../services/profileApi';
import {
  getCvSectionKeysToExpand,
  getProfileCvMissing,
  mentorApplyBlockedMessage,
} from '../utils/profileValidation';

const PLAN_LABELS = {
  free: 'MIỄN PHÍ',
  student: 'SINH VIÊN',
  professional: 'CHUYÊN NGHIỆP',
  premium: 'CAO CẤP',
};

const CV_PLACEHOLDERS = {
  intro:
    'Chia sẻ ngắn về bản thân, định hướng nghề nghiệp và mục tiêu hiện tại.',
  work: 'Mô tả vai trò, công ty, thời gian và thành tựu nổi bật trong sự nghiệp.',
  skills:
    'Cập nhật kỹ năng, công cụ, chứng chỉ hoặc khóa học bạn đã hoàn thành.',
  education:
    'Thêm trường, bằng cấp, chuyên ngành và thời gian học, có thể nhiều mốc.',
  extracurricular:
    'Thêm hoạt động, câu lạc bộ hoặc dự án ngoài lớp bạn từng tham gia.',
  awards: 'Thêm thành tích, giải thưởng hoặc sự ghi nhận nổi bật.',
};

function getInitials(name) {
  const parts = String(name || 'U').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ProfileAccordion({ title, required, open, onToggle, children }) {
  return (
    <View style={styles.accordionItem}>
      <TouchableOpacity style={styles.accordionTrigger} onPress={onToggle} activeOpacity={0.85}>
        <Text style={styles.accordionTitle}>
          {title}
          {required ? <Text style={styles.requiredMark}> *</Text> : null}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#8037f4" />
      </TouchableOpacity>
      {open ? <View style={styles.accordionPanel}>{children}</View> : null}
    </View>
  );
}

function buildFormFromUser(user, mentor) {
  const expertise = Array.isArray(user?.expertise) ? user.expertise.join(', ') : '';
  const mentorSkills =
    Array.isArray(mentor?.specialties) && mentor.specialties.length
      ? mentor.specialties.join(', ')
      : '';
  return {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: mentor?.bio || user?.bio || '',
    position: mentor?.title || user?.position || '',
    currentCompany: mentor?.company || user?.currentCompany || '',
    experience:
      mentor?.experienceYears != null
        ? String(mentor.experienceYears)
        : user?.experience != null
          ? String(user.experience)
          : '',
    school: user?.school || '',
    profileWorkExperience: user?.profileWorkExperience || mentor?.profileWorkExperience || '',
    profileEducation: user?.profileEducation || mentor?.profileEducation || user?.school || '',
    profileExtracurricular: user?.profileExtracurricular || mentor?.profileExtracurricular || '',
    profileAwards: user?.profileAwards || mentor?.profileAwards || '',
    skillsCerts: mentorSkills || expertise,
    targetRate:
      mentor?.pricePerHour != null && mentor.pricePerHour > 0
        ? String(mentor.pricePerHour)
        : '',
  };
}

export default function ProfileScreen({
  user,
  onUserUpdated,
  onOpenLearning,
  onOpenHistoryPayments,
  onOpenHistoryBookings,
  onOpenHistoryCv,
  onOpenProfileInfo,
  onOpenRoleCourses,
  onOpenRoleFinance,
  onOpenRoleSessions,
  onLogout,
  ownedCourseCount = 0,
  /** 'hub' = avatar + menu; 'edit' = form hồ sơ đầy đủ */
  mode = 'hub',
}) {
  const isMentor = user?.role === 'mentor';
  const isCustomer = !isMentor;
  const [form, setForm] = useState(() => buildFormFromUser(user, null));
  const [openSections, setOpenSections] = useState({
    intro: true,
    work: false,
    skills: false,
    price: false,
    education: false,
    extracurricular: false,
    awards: false,
  });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [applying, setApplying] = useState(false);
  const [mentorProfile, setMentorProfile] = useState(null);
  const [mentorApplyError, setMentorApplyError] = useState('');

  useEffect(() => {
    setForm(buildFormFromUser(user, mentorProfile));
  }, [user, mentorProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchMyMentorProfile();
      if (!cancelled && res.success) setMentorProfile(res.mentor);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const expandSectionsForMissing = (currentForm) => {
    const keys = getCvSectionKeysToExpand(currentForm);
    if (!keys.length) return;
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = true;
      return next;
    });
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const notify = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(message);
      return;
    }
    Alert.alert(title, message);
  };

  const processAvatarAsset = useCallback(async (asset) => {
    if (!asset?.uri) return;

    setAvatarUploading(true);
    setAvatarPreview(asset.uri);

    const uploaded = await uploadAvatarImage(asset);
    if (!uploaded.success || !uploaded.url) {
      setAvatarUploading(false);
      setAvatarPreview(null);
      notify('Lỗi', uploaded.error || 'Upload ảnh thất bại.');
      return;
    }

    const saved = await patchCurrentUser({ avatar: uploaded.url });
    setAvatarUploading(false);

    if (!saved.success) {
      setAvatarPreview(null);
      notify('Lỗi', saved.error || 'Không lưu được ảnh đại diện.');
      return;
    }

    setAvatarPreview(null);
    onUserUpdated?.(saved.user);
    notify('Thành công', 'Đã cập nhật ảnh đại diện.');
  }, [onUserUpdated]);

  const pickAvatarFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Quyền truy cập', 'Cần quyền thư viện ảnh để đổi avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await processAvatarAsset(result.assets[0]);
  }, [processAvatarAsset]);

  const pickAvatarFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      notify('Quyền truy cập', 'Cần quyền camera để chụp ảnh đại diện.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await processAvatarAsset(result.assets[0]);
  }, [processAvatarAsset]);

  const handleAvatarPress = useCallback(() => {
    if (avatarUploading) return;

    if (Platform.OS === 'web') {
      pickAvatarFromLibrary();
      return;
    }

    Alert.alert('Ảnh đại diện', 'Chọn cách cập nhật', [
      { text: 'Thư viện ảnh', onPress: () => { void pickAvatarFromLibrary(); } },
      { text: 'Chụp ảnh', onPress: () => { void pickAvatarFromCamera(); } },
      { text: 'Hủy', style: 'cancel' },
    ]);
  }, [avatarUploading, pickAvatarFromCamera, pickAvatarFromLibrary]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload = buildUserProfilePayload(form);
    const res = await patchCurrentUser(payload);
    if (!res.success) {
      setSaving(false);
      notify('Lỗi', res.error || 'Không lưu được hồ sơ.');
      return;
    }
    onUserUpdated?.(res.user);

    if (isMentor) {
      const mentorRes = await updateMyMentorProfile(buildMentorUpdatePayload(form));
      setSaving(false);
      if (!mentorRes.success) {
        notify('Lỗi', mentorRes.error || 'Không cập nhật được hồ sơ mentor.');
        return;
      }
      if (mentorRes.mentor) setMentorProfile(mentorRes.mentor);
      notify('Thành công', 'Đã cập nhật hồ sơ cố vấn.');
      return;
    }

    setSaving(false);
    notify('Thành công', 'Đã cập nhật hồ sơ.');
  }, [form, isMentor, onUserUpdated]);

  const handleApplyMentor = useCallback(async () => {
    if (!isCustomer) return;
    const missing = getProfileCvMissing(form);
    if (missing.length) {
      setMentorApplyError(mentorApplyBlockedMessage(missing));
      expandSectionsForMissing(form);
      notify('Thiếu thông tin', mentorApplyBlockedMessage(missing));
      return;
    }
    setMentorApplyError('');
    setApplying(true);
    const saveRes = await patchCurrentUser(buildUserProfilePayload(form));
    if (!saveRes.success) {
      setApplying(false);
      notify('Lỗi', saveRes.error || 'Không lưu được hồ sơ trước khi gửi.');
      return;
    }
    onUserUpdated?.(saveRes.user);
    const applyRes = await applyAsMentor(buildMentorApplyPayload(form));
    setApplying(false);
    if (applyRes.success) {
      setMentorProfile(applyRes.mentor);
      notify('Thành công', applyRes.message || 'Hồ sơ mentor đã được gửi duyệt.');
    } else {
      notify('Lỗi', applyRes.error || 'Gửi yêu cầu thất bại.');
    }
  }, [form, isCustomer, onUserUpdated]);

  const roleBadge = isMentor
    ? 'MENTOR'
    : PLAN_LABELS[user?.plan] || PLAN_LABELS.free;
  const mentorStatus = mentorProfile?.adminReview?.status;
  const mentorVerified = mentorProfile?.isVerified === true || mentorStatus === 'approved';
  const displayAvatar = avatarPreview || resolveMediaUrl(user?.avatar);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.profileScreenScroll}
      contentContainerStyle={styles.scroll}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {mode === 'hub' ? (
      <>
      {/* Sidebar card */}
      <View style={styles.summaryCard}>
        <TouchableOpacity
          style={styles.avatarOuter}
          onPress={handleAvatarPress}
          disabled={avatarUploading}
          activeOpacity={0.88}
        >
          <View style={styles.avatarWrap}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{getInitials(form.name)}</Text>
            )}
          </View>
          <View style={styles.avatarCamera}>
            {avatarUploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="camera" size={12} color="#ffffff" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.summaryName}>{form.name || (isMentor ? 'Mentor' : 'Người dùng')}</Text>
        <Text style={styles.summaryPlan}>{roleBadge}</Text>
        {isMentor && mentorStatus === 'pending' ? (
          <Text style={styles.mentorPendingHint}>Hồ sơ mentor đang chờ duyệt</Text>
        ) : null}
        {isMentor && mentorVerified ? (
          <Text style={styles.mentorPendingHint}>Cố vấn đã xác minh</Text>
        ) : null}

        {(onOpenProfileInfo ||
          (isCustomer &&
            (onOpenLearning ||
              onOpenHistoryPayments ||
              onOpenHistoryBookings ||
              onOpenHistoryCv))) ? (
          <View style={styles.libraryMenu}>
            {onOpenProfileInfo ? (
              <TouchableOpacity
                style={styles.libraryMenuRow}
                onPress={onOpenProfileInfo}
                activeOpacity={0.85}
              >
                <View style={styles.libraryMenuLeft}>
                  <View style={styles.libraryMenuIcon}>
                    <Ionicons name="person-outline" size={17} color="#8037f4" />
                  </View>
                  <View>
                    <Text style={styles.libraryMenuLabel}>Thông tin cá nhân</Text>
                    <Text style={styles.libraryMenuSub}>Giới thiệu, kinh nghiệm & kỹ năng</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ) : null}
            {isCustomer && onOpenLearning ? (
              <TouchableOpacity
                style={styles.libraryMenuRow}
                onPress={onOpenLearning}
                activeOpacity={0.85}
              >
                <View style={styles.libraryMenuLeft}>
                  <View style={styles.libraryMenuIcon}>
                    <Ionicons name="play-circle-outline" size={17} color="#8037f4" />
                  </View>
                  <View>
                    <Text style={styles.libraryMenuLabel}>Khóa học đã mua</Text>
                    <Text style={styles.libraryMenuSub}>
                      {ownedCourseCount > 0 ? `${ownedCourseCount} khóa trong thư viện` : 'Chưa có khóa học'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ) : null}
            {isCustomer && onOpenHistoryPayments ? (
              <TouchableOpacity
                style={styles.libraryMenuRow}
                onPress={onOpenHistoryPayments}
                activeOpacity={0.85}
              >
                <View style={styles.libraryMenuLeft}>
                  <View style={styles.libraryMenuIcon}>
                    <Ionicons name="wallet-outline" size={17} color="#8037f4" />
                  </View>
                  <View>
                    <Text style={styles.libraryMenuLabel}>Lịch sử giao dịch</Text>
                    <Text style={styles.libraryMenuSub}>Thanh toán khóa học & gói</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ) : null}
            {isCustomer && onOpenHistoryBookings ? (
              <TouchableOpacity
                style={styles.libraryMenuRow}
                onPress={onOpenHistoryBookings}
                activeOpacity={0.85}
              >
                <View style={styles.libraryMenuLeft}>
                  <View style={styles.libraryMenuIcon}>
                    <Ionicons name="calendar-outline" size={17} color="#8037f4" />
                  </View>
                  <View>
                    <Text style={styles.libraryMenuLabel}>Lịch sử phỏng vấn</Text>
                    <Text style={styles.libraryMenuSub}>Buổi hẹn mentor đã đặt</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ) : null}
            {isCustomer && onOpenHistoryCv ? (
              <TouchableOpacity
                style={[styles.libraryMenuRow, styles.libraryMenuRowLast]}
                onPress={onOpenHistoryCv}
                activeOpacity={0.85}
              >
                <View style={styles.libraryMenuLeft}>
                  <View style={styles.libraryMenuIcon}>
                    <Ionicons name="document-text-outline" size={17} color="#8037f4" />
                  </View>
                  <View>
                    <Text style={styles.libraryMenuLabel}>Lịch sử CV</Text>
                    <Text style={styles.libraryMenuSub}>Các lần phân tích hồ sơ</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {isMentor && (onOpenRoleSessions || onOpenRoleCourses || onOpenRoleFinance) ? (
          <View style={styles.libraryMenu}>
            {onOpenRoleSessions ? (
              <TouchableOpacity style={styles.libraryMenuRow} onPress={onOpenRoleSessions} activeOpacity={0.85}>
                <View style={styles.libraryMenuLeft}>
                  <View style={styles.libraryMenuIcon}>
                    <Ionicons name="calendar-outline" size={17} color="#8037f4" />
                  </View>
                  <View>
                    <Text style={styles.libraryMenuLabel}>Lịch mentoring</Text>
                    <Text style={styles.libraryMenuSub}>Buổi hẹn với mentee</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ) : null}
            {onOpenRoleCourses ? (
              <TouchableOpacity
                style={[styles.libraryMenuRow, !onOpenRoleFinance && styles.libraryMenuRowLast]}
                onPress={onOpenRoleCourses}
                activeOpacity={0.85}
              >
                <View style={styles.libraryMenuLeft}>
                  <View style={styles.libraryMenuIcon}>
                    <Ionicons name="school-outline" size={17} color="#8037f4" />
                  </View>
                  <View>
                    <Text style={styles.libraryMenuLabel}>Khóa học của tôi</Text>
                    <Text style={styles.libraryMenuSub}>Publish & đánh giá</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ) : null}
            {onOpenRoleFinance ? (
              <TouchableOpacity
                style={[styles.libraryMenuRow, styles.libraryMenuRowLast]}
                onPress={onOpenRoleFinance}
                activeOpacity={0.85}
              >
                <View style={styles.libraryMenuLeft}>
                  <View style={styles.libraryMenuIcon}>
                    <Ionicons name="wallet-outline" size={17} color="#8037f4" />
                  </View>
                  <View>
                    <Text style={styles.libraryMenuLabel}>Tài chính</Text>
                    <Text style={styles.libraryMenuSub}>Số dư & rút tiền</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(45,27,105,0.28)" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {onLogout ? (
        <TouchableOpacity style={styles.logoutFooterButton} onPress={onLogout} activeOpacity={0.88}>
          <Text style={styles.logoutFooterTitle}>Đăng xuất</Text>
        </TouchableOpacity>
      ) : null}
      </>
      ) : null}

      {mode === 'edit' ? (
      <>
      {/* Main form card */}
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Ionicons name={isMentor ? 'school' : 'person'} size={20} color="#8037f4" />
          <Text style={styles.formTitle}>
            {isMentor ? (
              <>Hồ sơ <Text style={styles.formTitleAccent}>cố vấn</Text></>
            ) : (
              <>Hồ sơ <Text style={styles.formTitleAccent}>cá nhân</Text></>
            )}
          </Text>
        </View>
        <Text style={styles.formHint}>
          {isMentor
            ? 'Thông tin hiển thị trên trang cố vấn công khai. Email dùng để đăng nhập.'
            : 'Cập nhật thông tin cá nhân. Email dùng để đăng nhập.'}
        </Text>
        {isCustomer && mentorApplyError ? (
          <Text style={styles.mentorApplyError}>{mentorApplyError}</Text>
        ) : null}

        {/* THÔNG TIN CƠ BẢN */}
        <View style={styles.staticSection}>
          <Text style={styles.sectionHeading}>THÔNG TIN</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabelSmall}>Họ và tên *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              placeholder="Nhập họ và tên..."
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabelSmall}>Email *</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              placeholder="email@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabelSmall}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(v) => setField('phone', v)}
              placeholder="Nhập số điện thoại..."
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <ProfileAccordion
              title="Giới thiệu bản thân"
              required={isCustomer}
              open={openSections.intro}
              onToggle={() => toggleSection('intro')}
            >
              <TextInput
                style={styles.textarea}
                value={form.bio}
                onChangeText={(v) => setField('bio', v)}
                placeholder={
                  isMentor
                    ? 'Giới thiệu kinh nghiệm mentoring và lĩnh vực chuyên môn...'
                    : CV_PLACEHOLDERS.intro
                }
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </ProfileAccordion>

        <ProfileAccordion
              title="Kinh nghiệm làm việc"
              required={isCustomer}
              open={openSections.work}
              onToggle={() => toggleSection('work')}
            >
              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabelSmall}>{isMentor ? 'Chức danh mentor' : 'Vị trí hiện tại'}</Text>
                  <TextInput
                    style={styles.input}
                    value={form.position}
                    onChangeText={(v) => setField('position', v)}
                    placeholder="VD: Backend Developer"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabelSmall}>Công ty</Text>
                  <TextInput
                    style={styles.input}
                    value={form.currentCompany}
                    onChangeText={(v) => setField('currentCompany', v)}
                    placeholder="VD: FPT Software"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabelSmall}>Số năm kinh nghiệm</Text>
                <TextInput
                  style={styles.input}
                  value={form.experience}
                  onChangeText={(v) => setField('experience', v.replace(/\D/g, ''))}
                  placeholder="VD: 3"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
              </View>
              <TextInput
                style={styles.textarea}
                value={form.profileWorkExperience}
                onChangeText={(v) => setField('profileWorkExperience', v)}
                placeholder={CV_PLACEHOLDERS.work}
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </ProfileAccordion>

        <ProfileAccordion
              title={isMentor ? 'Chuyên môn & kỹ năng' : 'Kỹ năng & chứng chỉ'}
              required={isCustomer}
              open={openSections.skills}
              onToggle={() => toggleSection('skills')}
            >
              <TextInput
                style={styles.textarea}
                value={form.skillsCerts}
                onChangeText={(v) => setField('skillsCerts', v)}
                placeholder={
                  isMentor
                    ? 'VD: System Design, Behavioral Interview, React (cách nhau bởi dấu phẩy)'
                    : CV_PLACEHOLDERS.skills
                }
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </ProfileAccordion>

            {(isCustomer || isMentor) ? (
              <ProfileAccordion
                title={isMentor ? 'Mức giá buổi mentoring' : 'Mức giá đăng ký'}
                required={isCustomer}
                open={openSections.price}
                onToggle={() => toggleSection('price')}
              >
                <View style={styles.priceInputWrap}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={form.targetRate ? Number(form.targetRate).toLocaleString('vi-VN') : ''}
                    onChangeText={(v) => setField('targetRate', v.replace(/\D/g, ''))}
                    placeholder="VD: 300.000 (VNĐ / 60 phút)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                  />
                  <Text style={styles.priceSuffix}>₫</Text>
                </View>
              </ProfileAccordion>
            ) : null}

        <ProfileAccordion
              title="Quá trình học tập"
              open={openSections.education}
              onToggle={() => toggleSection('education')}
            >
              <TextInput
                style={styles.textarea}
                value={form.profileEducation}
                onChangeText={(v) => setField('profileEducation', v)}
                placeholder={CV_PLACEHOLDERS.education}
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </ProfileAccordion>

        <ProfileAccordion
              title="Hoạt động ngoại khóa"
              open={openSections.extracurricular}
              onToggle={() => toggleSection('extracurricular')}
            >
              <TextInput
                style={styles.textarea}
                value={form.profileExtracurricular}
                onChangeText={(v) => setField('profileExtracurricular', v)}
                placeholder={CV_PLACEHOLDERS.extracurricular}
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </ProfileAccordion>

        <ProfileAccordion
              title="Tên giải thưởng"
              open={openSections.awards}
              onToggle={() => toggleSection('awards')}
            >
              <TextInput
                style={styles.textarea}
                value={form.profileAwards}
                onChangeText={(v) => setField('profileAwards', v)}
                placeholder={CV_PLACEHOLDERS.awards}
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </ProfileAccordion>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.saveBtnOutline}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#2D1B69" />
            ) : (
              <Text style={styles.saveBtnOutlineText}>Lưu hồ sơ</Text>
            )}
          </TouchableOpacity>
          {isCustomer ? (
            <TouchableOpacity
              style={styles.saveBtnLime}
              onPress={handleApplyMentor}
              disabled={applying}
              activeOpacity={0.9}
            >
              {applying ? (
                <ActivityIndicator color="#2D1B69" />
              ) : (
                <Text style={styles.saveBtnLimeText}>Đăng ký làm Mentor</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileScreenScroll: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 88,
    gap: 12,
  },
  summaryCard: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  avatarOuter: {
    width: 80,
    height: 80,
    marginBottom: 10,
    position: 'relative',
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: '#8037f4',
    backgroundColor: '#f8f5ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8037f4',
  },
  avatarCamera: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8037f4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    zIndex: 2,
    elevation: 4,
  },
  summaryName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2D1B69',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  summaryPlan: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(45, 27, 105, 0.58)',
    letterSpacing: 0.8,
  },
  mentorPendingHint: {
    marginTop: 8,
    fontSize: 10,
    color: '#8037f4',
    fontWeight: '600',
    textAlign: 'center',
  },
  libraryMenu: {
    width: '100%',
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.14)',
    overflow: 'hidden',
    shadowColor: '#8037f4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  libraryMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 55, 244, 0.08)',
  },
  libraryMenuRowLast: {
    borderBottomWidth: 0,
  },
  libraryMenuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  libraryMenuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(128, 55, 244, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryMenuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1B69',
  },
  libraryMenuSub: {
    marginTop: 1,
    fontSize: 10,
    color: 'rgba(45, 27, 105, 0.5)',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.18)',
    padding: 20,
    shadowColor: '#8037f4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 55, 244, 0.14)',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D1B69',
    letterSpacing: -0.4,
  },
  formTitleAccent: {
    color: '#8037f4',
  },
  formHint: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(45, 27, 105, 0.58)',
    marginBottom: 16,
  },
  mentorApplyError: {
    fontSize: 12,
    lineHeight: 18,
    color: '#dc2626',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    fontWeight: '600',
  },
  staticSection: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 55, 244, 0.1)',
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2D1B69',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 3,
    borderBottomColor: '#93f72b',
    alignSelf: 'flex-start',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(45, 27, 105, 0.58)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldLabelSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(45, 27, 105, 0.58)',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2D1B69',
    marginBottom: 0,
  },
  textarea: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128, 55, 244, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2D1B69',
    minHeight: 100,
    lineHeight: 20,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceSuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(45, 27, 105, 0.58)',
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 55, 244, 0.1)',
  },
  accordionTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#2D1B69',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingBottom: 4,
    borderBottomWidth: 3,
    borderBottomColor: '#93f72b',
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  requiredMark: {
    color: '#ef4444',
    fontWeight: '800',
  },
  accordionPanel: {
    paddingBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 55, 244, 0.14)',
  },
  saveBtnOutline: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#93f72b',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D1B69',
  },
  saveBtnLime: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#93f72b',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#93f72b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 3,
  },
  saveBtnLimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D1B69',
  },
  logoutFooterButton: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutFooterTitle: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '800',
  },
});
