import React, { useState, useEffect } from "react";
import { AdminPanel } from "./AdminPanel.jsx";
import { 
  getAchievements, 
  addAchievement, 
  updateAchievement, 
  deleteAchievement 
} from "../../utils/mockAchievements.js";
import { Plus, Edit2, Trash2, Check, X, Image as ImageIcon } from "lucide-react";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";

export function AdminAchievements() {
  const [achievements, setAchievements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
    isPublished: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setAchievements(getAchievements());
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        title: item.title || "",
        content: item.content || "",
        imageUrl: item.imageUrl || "",
        isPublished: item.isPublished ?? true
      });
    } else {
      setEditingId(null);
      setFormData({
        title: "",
        content: "",
        imageUrl: "",
        isPublished: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toastApiError("Vui lòng nhập đầy đủ Tiêu đề và Nội dung.");
      return;
    }

    if (editingId) {
      updateAchievement(editingId, formData);
      toastApiSuccess("Đã cập nhật thành tựu.");
    } else {
      addAchievement(formData);
      toastApiSuccess("Đã thêm thành tựu mới.");
    }
    
    loadData();
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thành tựu này?")) {
      deleteAchievement(id);
      toastApiSuccess("Đã xóa thành tựu.");
      loadData();
    }
  };

  const togglePublish = (item) => {
    updateAchievement(item.id, { isPublished: !item.isPublished });
    toastApiSuccess(`Đã ${!item.isPublished ? "hiển thị" : "ẩn"} thành tựu.`);
    loadData();
  };

  return (
    <AdminPanel 
      title="Quản lý Thành tựu" 
      description="Thêm, sửa, xóa các cột mốc và sự kiện nổi bật của ProInterview."
    >
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Thêm thành tựu
        </button>
      </div>

      <div className="glass-card overflow-hidden border-slate-200/90">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-4">Hình ảnh</th>
                <th className="p-4">Tiêu đề</th>
                <th className="p-4">Ngày tạo</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {achievements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                    Chưa có thành tựu nào.
                  </td>
                </tr>
              ) : (
                achievements.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-violet-50/30">
                    <td className="p-4">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt="Thumb" 
                          className="h-12 w-20 rounded-md object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 line-clamp-1" title={item.title}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-1" title={item.content}>
                        {item.content}
                      </p>
                    </td>
                    <td className="p-4 text-slate-600">
                      {new Date(item.date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => togglePublish(item)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                          item.isPublished 
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {item.isPublished ? (
                          <><Check className="h-3 w-3" /> Hiển thị</>
                        ) : (
                          <><X className="h-3 w-3" /> Đang ẩn</>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
                          title="Sửa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">
                {editingId ? "Sửa thành tựu" : "Thêm thành tựu mới"}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Tiêu đề <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Nhập tiêu đề..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Link hình ảnh (Tùy chọn)
                </label>
                <input 
                  type="text" 
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Nội dung <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Viết mô tả ngắn gọn về thành tựu này..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="publish-toggle"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
                  className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-600"
                />
                <label htmlFor="publish-toggle" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Hiển thị bài viết này trên trang chủ
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={handleCloseModal}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 shadow-lg shadow-violet-600/20"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPanel>
  );
}
