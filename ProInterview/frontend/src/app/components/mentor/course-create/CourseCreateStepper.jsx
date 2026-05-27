import { FlowStepBar } from "../../shared/FlowStepBar";

const COURSE_CREATE_STEPS = [
  { n: 1, label: "Thông tin" },
  { n: 2, label: "Nội dung" },
  { n: 3, label: "Xem & đăng" },
];

export function CourseCreateStepper({ step }) {
  return (
    <FlowStepBar
      steps={COURSE_CREATE_STEPS}
      current={step}
      ariaLabel="Tiến trình tạo khóa học"
    />
  );
}
