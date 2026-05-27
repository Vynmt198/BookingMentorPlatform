const MOCK_COURSES = [
  {
    id: "course-fe-101",
    title: "Frontend Interview Foundation",
    description: "Luyen tu duy tra loi Frontend theo STAR va cau truc ro rang.",
    level: "Beginner",
    price: 0,
    mentor: {
      id: "mentor-anna",
      name: "Anna Nguyen",
      avatar: "https://i.pravatar.cc/120?img=21",
      company: "Shopee",
    },
    modules: [
      {
        id: "m1",
        title: "Tong quan Frontend Interview",
        lessons: [
          {
            id: "l1",
            title: "Nha tuyen dung danh gia dieu gi",
            durationMin: 12,
            isFree: true,
            content:
              "Mock content: Nha tuyen dung uu tien communication, problem solving va kha nang ra quyet dinh.",
          },
          {
            id: "l2",
            title: "Framework STAR cho behavioral",
            durationMin: 15,
            isFree: false,
            content:
              "Mock content: STAR = Situation, Task, Action, Result. Luon ket thuc bang impact do luong duoc.",
          },
        ],
      },
      {
        id: "m2",
        title: "Tra loi cau hoi ky thuat",
        lessons: [
          {
            id: "l3",
            title: "System design can ban cho FE",
            durationMin: 20,
            isFree: false,
            content:
              "Mock content: Bat dau bang yeu cau, define tradeoff, dua ra architecture tong quan truoc.",
          },
        ],
      },
    ],
  },
  {
    id: "course-be-201",
    title: "Backend Interview Practice",
    description: "Luyen phong van Backend voi bo cau hoi theo tinh huong thuc te.",
    level: "Intermediate",
    price: 79000,
    mentor: {
      id: "mentor-khanh",
      name: "Khanh Tran",
      avatar: "https://i.pravatar.cc/120?img=14",
      company: "FPT Software",
    },
    modules: [
      {
        id: "m1",
        title: "API va database",
        lessons: [
          {
            id: "l1",
            title: "REST API best practices",
            durationMin: 18,
            isFree: true,
            content:
              "Mock content: Dung status code ro rang, validate input va co rate limit cho endpoint nhay cam.",
          },
          {
            id: "l2",
            title: "Database indexing basics",
            durationMin: 22,
            isFree: false,
            content:
              "Mock content: Index dung cot truy van thuong xuyen, can nhac write overhead va query plan.",
          },
        ],
      },
    ],
  },
];

const enrollmentsStore = new Map();

function getMockUserId(req) {
  const fromHeader = req.header("x-mock-user-id");
  const fromQuery = req.query.userId;
  return String(fromHeader || fromQuery || "demo-user");
}

function getUserEnrollments(userId) {
  if (!enrollmentsStore.has(userId)) {
    enrollmentsStore.set(userId, []);
  }
  return enrollmentsStore.get(userId);
}

function countTotalLessons(course) {
  return (course.modules || []).reduce(
    (acc, module) => acc + (module.lessons?.length || 0),
    0,
  );
}

function buildEnrollmentPayload(enrollment, course) {
  return {
    ...enrollment,
    course,
  };
}

export const MockCoursesController = {
  listCourses: (req, res) => {
    const userId = getMockUserId(req);
    const userEnrollments = getUserEnrollments(userId);
    const enrolledCourseIds = new Set(userEnrollments.map((item) => item.courseId));

    const courses = MOCK_COURSES.map((course) => ({
      ...course,
      totalLessons: countTotalLessons(course),
      isEnrolled: enrolledCourseIds.has(course.id),
    }));

    res.json({ success: true, userId, courses });
  },

  getCourseById: (req, res) => {
    const { id } = req.params;
    const course = MOCK_COURSES.find((item) => item.id === id);
    if (!course) {
      return res.status(404).json({ success: false, error: "Mock course not found" });
    }

    return res.json({
      success: true,
      course: {
        ...course,
        totalLessons: countTotalLessons(course),
      },
    });
  },

  enrollCourse: (req, res) => {
    const { id: courseId } = req.params;
    const userId = getMockUserId(req);
    const course = MOCK_COURSES.find((item) => item.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: "Mock course not found" });
    }

    const userEnrollments = getUserEnrollments(userId);
    const existing = userEnrollments.find((item) => item.courseId === courseId);
    if (existing) {
      return res.json({
        success: true,
        message: "Already enrolled",
        enrollment: buildEnrollmentPayload(existing, course),
      });
    }

    const enrollment = {
      id: `enr-${Date.now()}`,
      userId,
      courseId,
      progressPercent: 0,
      completedLessons: [],
      lastLessonId: null,
      certificateUrl: null,
      certificateIssuedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    userEnrollments.push(enrollment);
    return res.status(201).json({
      success: true,
      enrollment: buildEnrollmentPayload(enrollment, course),
    });
  },

  getMyEnrollments: (req, res) => {
    const userId = getMockUserId(req);
    const userEnrollments = getUserEnrollments(userId);

    const enrollments = userEnrollments
      .map((enrollment) => {
        const course = MOCK_COURSES.find((item) => item.id === enrollment.courseId);
        if (!course) return null;
        return buildEnrollmentPayload(enrollment, course);
      })
      .filter(Boolean);

    res.json({ success: true, userId, enrollments });
  },

  updateProgress: (req, res) => {
    const userId = getMockUserId(req);
    const { id: enrollmentId } = req.params;
    const { lessonId, isCompleted = true } = req.body || {};

    if (!lessonId) {
      return res.status(400).json({ success: false, error: "lessonId is required" });
    }

    const userEnrollments = getUserEnrollments(userId);
    const enrollment = userEnrollments.find((item) => item.id === enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: "Enrollment not found" });
    }

    const course = MOCK_COURSES.find((item) => item.id === enrollment.courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: "Mock course not found" });
    }

    if (isCompleted) {
      if (!enrollment.completedLessons.includes(lessonId)) {
        enrollment.completedLessons.push(lessonId);
      }
    } else {
      enrollment.completedLessons = enrollment.completedLessons.filter((id) => id !== lessonId);
    }

    enrollment.lastLessonId = lessonId;
    enrollment.updatedAt = new Date().toISOString();

    const totalLessons = countTotalLessons(course);
    enrollment.progressPercent =
      totalLessons > 0
        ? Math.round((enrollment.completedLessons.length / totalLessons) * 100)
        : 0;

    return res.json({
      success: true,
      enrollment: buildEnrollmentPayload(enrollment, course),
    });
  },

  getCertificate: (req, res) => {
    const userId = getMockUserId(req);
    const { id: enrollmentId } = req.params;

    const userEnrollments = getUserEnrollments(userId);
    const enrollment = userEnrollments.find((item) => item.id === enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: "Enrollment not found" });
    }

    const course = MOCK_COURSES.find((item) => item.id === enrollment.courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: "Mock course not found" });
    }

    if (enrollment.progressPercent < 100) {
      return res
        .status(400)
        .json({ success: false, error: "Complete 100% course progress first" });
    }

    if (!enrollment.certificateUrl) {
      const code = `MOCK-${enrollment.id.slice(-6).toUpperCase()}`;
      enrollment.certificateIssuedAt = new Date().toISOString();
      enrollment.certificateUrl = `https://mock.prointerview.vn/certificates/${code}.pdf`;
      enrollment.updatedAt = new Date().toISOString();
    }

    return res.json({
      success: true,
      certificate: {
        url: enrollment.certificateUrl,
        issuedAt: enrollment.certificateIssuedAt,
        courseTitle: course.title,
        code: enrollment.certificateUrl.split("/").pop().replace(".pdf", ""),
      },
    });
  },

  getLessonContent: (req, res) => {
    const userId = getMockUserId(req);
    const { id: courseId, lessonId } = req.params;
    const course = MOCK_COURSES.find((item) => item.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: "Mock course not found" });
    }

    let lesson = null;
    for (const module of course.modules || []) {
      const found = (module.lessons || []).find((item) => item.id === lessonId);
      if (found) {
        lesson = found;
        break;
      }
    }

    if (!lesson) {
      return res.status(404).json({ success: false, error: "Lesson not found" });
    }

    if (!lesson.isFree) {
      const userEnrollments = getUserEnrollments(userId);
      const enrolled = userEnrollments.some((item) => item.courseId === courseId);
      if (!enrolled) {
        return res.status(403).json({
          success: false,
          error: "Enroll this course first to view locked lesson content",
        });
      }
    }

    return res.json({ success: true, lesson });
  },
};
