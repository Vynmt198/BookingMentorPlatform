import React from "react";
import { Link, useLocation } from "react-router";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { motion } from "motion/react";

export function FailurePage() {
  const { state } = useLocation();
  const errorMsg = state?.error || "Giao dịch không thành công hoặc đã bị hủy.";

  return (
    <div className="min-h-screen bg-[#07060E] text-white flex items-center justify-center p-6 overflow-hidden antialiased">
      <div className="absolute top-[-10%] left-[-10%] h-[60vh] w-[60vh] rounded-full bg-red-500/10 blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg glass-card p-10 md:p-12 text-center"
      >
        <div className="relative inline-block mb-10">
           <div className="w-24 h-24 bg-red-500/20 rounded-[32px] flex items-center justify-center border border-red-500/30">
              <AlertTriangle className="w-12 h-12 text-red-500" />
           </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-4 text-red-500 uppercase">
           Thanh toán thất bại
        </h1>
        <p className="text-white/40 mb-12 text-[11px] font-bold uppercase tracking-widest leading-relaxed px-6">
           {errorMsg}
        </p>

        <div className="flex flex-col gap-4">
           <Link to="/pricing" className="h-16 bg-white text-black rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all">
              Thử lại thanh toán <RefreshCcw size={18} />
           </Link>
           <Link to="/" className="h-16 bg-white/5 text-white/30 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:text-white hover:bg-white/10 transition-all">
              Quay về Trang chủ <Home size={18} />
           </Link>
        </div>
      </motion.div>
      <style>{`
        .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(40px); border-radius: 40px; border: 1px solid rgba(255,255,255,0.08); }
      `}</style>
    </div>
  );
}
