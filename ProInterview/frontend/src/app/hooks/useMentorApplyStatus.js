import { useEffect, useState } from "react";
import { getUser, isLoggedIn } from "../utils/auth";
import { fetchMyMentorProfile } from "../utils/mentorApi";

/** Trạng thái đăng ký mentor (customer chưa có role mentor). */
export function useMentorApplyStatus() {
  const user = getUser();
  const isMentor = user?.role === "mentor";
  const [mentorProfile, setMentorProfile] = useState(null);

  useEffect(() => {
    if (!isLoggedIn() || isMentor) {
      setMentorProfile(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      void fetchMyMentorProfile().then((res) => {
        if (cancelled) return;
        setMentorProfile(res?.success && res.mentor ? res.mentor : null);
      });
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, [user?.email, isMentor]);

  const reviewStatus = mentorProfile
    ? mentorProfile?.adminReview?.status || (mentorProfile?.isVerified ? "approved" : "pending")
    : "";

  return {
    mentorProfile,
    reviewStatus,
    isPending: Boolean(mentorProfile) && reviewStatus === "pending",
    isRejected: mentorProfile?.adminReview?.status === "rejected",
    rejectionReason: mentorProfile?.adminReview?.reason || "",
  };
}
