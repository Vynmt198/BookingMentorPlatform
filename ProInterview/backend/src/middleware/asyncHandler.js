/**
 * Bọc route async — lỗi không bắt trong controller vẫn vào error handler.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
