const fs = require('fs');
const path = 'frontend/src/app/pages/account/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update the condition (this will catch the one at line 500)
content = content.replace('s.status === "confirmed" && (', '(s.status === "confirmed" || (s.status === "done" && !s.reviewId)) && (');

// Update the buttons inside the block
const oldButtons = `                             <button className="flex-1 h-10 rounded-xl bg-secondary text-black font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(232,121,249,0.2)]" onClick={() => navigate(\`/meeting/\${s.sessionId || s.backendId || s.id}\`)}>\n                                Vào phòng phỏng vấn\n                             </button>\n                             <button \n                               onClick={() => setCancellingBooking(s)}\n                               className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 transition-all hover:border-red-400 hover:bg-red-100"\n                               title="Hủy lịch hẹn (không hoàn tiền)"\n                             >\n                                <MsIcon name="cancel" size={22} className="text-red-700" />\n                             </button>`;

const newButtons = `                             {s.status === "confirmed" ? (\n                               <>\n                                 <button className="flex-1 h-10 rounded-xl bg-secondary text-black font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(232,121,249,0.2)]" onClick={() => navigate(\`/meeting/\${s.sessionId || s.backendId || s.id}\`)}>\n                                    Vào phòng phỏng vấn\n                                 </button>\n                                 <button \n                                   onClick={() => setCancellingBooking(s)}\n                                   className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 transition-all hover:border-red-400 hover:bg-red-100"\n                                   title="Hủy lịch hẹn (không hoàn tiền)"\n                                 >\n                                    <MsIcon name="cancel" size={22} className="text-red-700" />\n                                 </button>\n                               </>\n                             ) : (\n                               <button \n                                 onClick={() => navigate(\`/review/\${s.sessionId || s.backendId || s.id}\`)}\n                                 className="flex-1 h-10 rounded-xl bg-[#bff365] text-slate-900 font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(191,243,101,0.2)]"\n                               >\n                                  Gửi đánh giá Mentor\n                               </button>\n                             )}`;

// We use a more flexible replace for the buttons part to avoid whitespace issues
const buttonContainerStart = '<div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">';
const buttonContainerEnd = '</div>';

// Find the block after our new condition
const searchRegex = /\{\(s\.status === "confirmed" \|\| \(s\.status === "done" && !s\.reviewId\)\) && \(\s+<div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">([\s\S]*?)<\/div>\s+\)\}/g;

content = content.replace(searchRegex, (match, inner) => {
  // If the inner part still has the old buttons, replace it
  if (inner.includes('Vào phòng phỏng vấn')) {
    return `{(s.status === "confirmed" || (s.status === "done" && !s.reviewId)) && (
                          <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                             {s.status === "confirmed" ? (
                               <>
                                 <button className="flex-1 h-10 rounded-xl bg-secondary text-black font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(232,121,249,0.2)]" onClick={() => navigate(\`/meeting/\${s.sessionId || s.backendId || s.id}\`)}>
                                    Vào phòng phỏng vấn
                                 </button>
                                 <button 
                                   onClick={() => setCancellingBooking(s)}
                                   className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 transition-all hover:border-red-400 hover:bg-red-100"
                                   title="Hủy lịch hẹn (không hoàn tiền)"
                                 >
                                    <MsIcon name="cancel" size={22} className="text-red-700" />
                                 </button>
                               </>
                             ) : (
                               <button 
                                 onClick={() => navigate(\`/review/\${s.sessionId || s.backendId || s.id}\`)}\n                                 className="flex-1 h-10 rounded-xl bg-[#bff365] text-slate-900 font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(191,243,101,0.2)]"
                               >
                                  Gửi đánh giá Mentor
                               </button>
                             )}
                          </div>
                        )}`;
  }
  return match;
});

fs.writeFileSync(path, content);
console.log('Success');
