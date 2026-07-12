/** Hiển thị số tiền vi-VN — tách dấu chấm để không bị letter-spacing âm che mất. */
export function MentorMoneyText({ amount, suffix = " Đ", className = "" }) {
  const text = Number(amount || 0).toLocaleString("vi-VN");
  return (
    <span className={className}>
      {text.split(/(\.)/g).map((part, i) =>
        part === "." ? (
          <span key={`sep-${i}`} className="money-thousands-sep" aria-hidden="true">
            .
          </span>
        ) : (
          <span key={`n-${i}`}>{part}</span>
        ),
      )}
      {suffix}
    </span>
  );
}
