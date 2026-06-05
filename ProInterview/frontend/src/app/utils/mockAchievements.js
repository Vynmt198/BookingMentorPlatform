export const STORAGE_KEY = "mock_achievements";

// Initial mock data if empty
const INITIAL_DATA = [
  {
    id: "a1",
    title: "Vượt mốc 10.000 học viên",
    content: "ProInterview tự hào khi được đồng hành cùng hơn 10.000 học viên trên con đường chinh phục sự nghiệp. Đây là một cột mốc quan trọng đánh dấu sự phát triển của hệ thống đánh giá phỏng vấn bằng AI, giúp hàng ngàn bạn trẻ tự tin hơn trước các nhà tuyển dụng.",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800",
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isPublished: true,
  },
  {
    id: "a2",
    title: "Giải thưởng Đột phá AI Giáo dục 2026",
    content: "Vinh dự nhận giải thưởng danh giá về ứng dụng Trí tuệ nhân tạo (AI) trong lĩnh vực Giáo dục và Tuyển dụng. Hệ thống phỏng vấn giả lập của ProInterview đã xuất sắc vượt qua nhiều đối thủ nhờ tính thực tiễn và khả năng mô phỏng phỏng vấn chính xác.",
    imageUrl: "https://images.unsplash.com/photo-1568225367116-3e4bfa09995c?auto=format&fit=crop&q=80&w=800",
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    isPublished: true,
  }
];

export function getAchievements() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  return JSON.parse(data);
}

export function saveAchievements(achievements) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
}

export function addAchievement(data) {
  const items = getAchievements();
  const newItem = {
    ...data,
    id: "a" + Date.now(),
    date: new Date().toISOString(),
  };
  saveAchievements([newItem, ...items]);
  return newItem;
}

export function updateAchievement(id, data) {
  const items = getAchievements();
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data };
    saveAchievements(items);
    return items[idx];
  }
  return null;
}

export function deleteAchievement(id) {
  const items = getAchievements();
  saveAchievements(items.filter((i) => i.id !== id));
}
