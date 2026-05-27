import React from "react";
import { Link, useLocation } from "react-router";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function SuccessPage() {
  const { state } = useLocation();
  const details = state?.details || {};

  return (
    <div className="min-h-screen bg-[#07060E] text-white flex items-center justify-center p-6 overflow-hidden antialiased">
      <div className="absolute top-[-10%] right-[-10%] h-[60vh] w-[60vh] rounded-full bg-emerald-500/10 blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg glass-card p-10 md:p-12 text-center"
      >
        <div className="relative inline-block mb-10">
           <div className="w-24 h-24 bg-emerald-500/20 rounded-[32px] flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
           </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-4 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent uppercase">
           Giao dịch thành công!
        </h1>
        <p className="text-white/40 mb-10 text-[11px] font-bold uppercase tracking-widest leading-relaxed">Gói dịch vụ ProInterview của bạn đã được kích hoạt thành công.</p>

        {details.orderId && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 text-left mb-10 overflow-hidden relative">
             <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/[0.05] pb-3">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Số tiền</span>
                   <span className="text-xl font-black text-[#93f72b]">{details.amount}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                   <span className="text-white/30 font-black uppercase tracking-widest">Mã đơn hàng</span>
                   <span className="font-bold text-white/80">{details.orderId}</span>
                </div>
                {details.transNo && (
                   <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/30 font-black uppercase tracking-widest">Mã giao dịch</span>
                      <span className="font-mono text-white/80">{details.transNo}</span>
                   </div>
                )}
                <div className="flex justify-between items-center text-[10px]">
                   <span className="text-white/30 font-black uppercase tracking-widest">Thời gian</span>
                   <span className="text-white/80">{details.date}</span>
                </div>
             </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
           <Link to="/" className="h-16 bg-[#93f72b] text-black rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_12px_45px_rgba(196,255,71,0.25)]">
              Về trang chủ <ArrowRight size={18} />
           </Link>
           <Link to="/pricing" className="h-16 bg-white/5 text-white/30 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:text-white hover:bg-white/10 transition-all">
              Xem bảng giá
           </Link>
        </div>
      </motion.div>
      <style>{`
        .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(40px); border-radius: 40px; border: 1px solid rgba(255,255,255,0.08); }
        .bg-primary-fixed { background-color: #93f72b; }
      `}</style>
    </div>
  );
}
