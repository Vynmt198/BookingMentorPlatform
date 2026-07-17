$path = 'frontend/src/app/pages/account/Dashboard.jsx'
$content = Get-Content $path -Raw

$reviewBlock = '
                        {s.status === "done" && !s.reviewId && (
                          <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                             <button 
                               onClick={() => navigate(`/review/${s.sessionId || s.backendId || s.id}`)}
                               className="flex-1 h-10 rounded-xl bg-[#bff365] text-slate-900 font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(191,243,101,0.2)]"
                             >
                                Gửi đánh giá Mentor
                             </button>
                          </div>
                        )}'

# Search for the confirmed status block end
$target = '                        }' + ')'
$newContent = $content -replace [regex]::Escape($target), ($target + $reviewBlock)

Set-Content $path $newContent -NoNewline
