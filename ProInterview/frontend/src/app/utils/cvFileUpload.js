import { uploadFile } from "./uploadApi.js";

/** Upload CV (+ JD nếu có) lên /api/upload — trả URL lưu MongoDB */
export async function uploadCvJdFiles(cvFile, jdFile, { includeJd = false } = {}) {
  const out = {
    cvFileUrl: null,
    jdFileUrl: null,
    cvFileId: null,
    jdFileId: null,
    warnings: [],
  };

  if (cvFile) {
    const res = await uploadFile(cvFile, "cv");
    if (res.success) {
      out.cvFileUrl = res.url;
      out.cvFileId = res.fileId || null;
    } else {
      out.warnings.push(res.error || "Không upload được CV");
    }
  }

  if (includeJd && jdFile) {
    const res = await uploadFile(jdFile, "jd");
    if (res.success) {
      out.jdFileUrl = res.url;
      out.jdFileId = res.fileId || null;
    } else {
      out.warnings.push(res.error || "Không upload được JD");
    }
  }

  return out;
}
