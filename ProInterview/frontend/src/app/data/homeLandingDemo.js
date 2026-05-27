/**
 * Dữ liệu minh họa cố định cho Home (Mentor/Courses showcase).
 * Trang thật dùng API — chỉ section marketing trên landing cần demo tĩnh.
 */

export const HOME_DEMO_MENTORS = [
  {
    id: "1",
    name: "Nguyễn Văn Minh",
    title: "Senior Software Engineer",
    company: "Shopee",
    field: "IT",
    experience: 7,
    rating: 4.9,
    reviews: 143,
    price: 350000,
    avatar:
      "https://images.unsplash.com/photo-1752118464988-2914fb27d0f0?w=400&q=80",
    tags: ["Backend", "System Design", "Node.js"],
    available: true,
  },
  {
    id: "2",
    name: "Trần Thị Hương",
    title: "Engineering Manager",
    company: "Grab Vietnam",
    field: "IT",
    experience: 9,
    rating: 4.8,
    reviews: 118,
    price: 380000,
    avatar:
      "https://images.unsplash.com/photo-1736939678218-bd648b5ef3bb?w=400&q=80",
    tags: ["Leadership", "System Design"],
    available: true,
  },
];

const STAR_LESSONS = [
  { id: "1-1", title: "Giới thiệu STAR Method", duration: 12, order: 1 },
  { id: "1-2", title: "Situation, đặt bối cảnh", duration: 18, order: 2 },
  { id: "1-3", title: "Task, nhiệm vụ của bạn", duration: 15, order: 3 },
  { id: "1-4", title: "Action, hành động cụ thể", duration: 22, order: 4 },
];

const CV_LESSONS = [
  { id: "2-1", title: "Cấu trúc CV chuẩn ATS", duration: 14, order: 1 },
  { id: "2-2", title: "Bullet có số liệu", duration: 16, order: 2 },
  { id: "2-3", title: "Từ khóa theo JD", duration: 18, order: 3 },
];

export const HOME_DEMO_COURSES = [
  {
    id: "1",
    title: "Làm chủ STAR Method trong phỏng vấn hành vi",
    category: "Interview Skills",
    mentorName: "Nguyễn Văn Minh",
    mentorCompany: "Shopee",
    duration: 220,
    lessonsCount: 12,
    lessons: STAR_LESSONS,
  },
  {
    id: "2",
    title: "Viết CV thu hút recruiter trong 7 ngày",
    category: "Viết CV",
    mentorName: "Trần Thị Hương",
    mentorCompany: "Grab Vietnam",
    duration: 180,
    lessonsCount: 10,
    lessons: CV_LESSONS,
  },
];
