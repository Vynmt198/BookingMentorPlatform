$path = 'frontend/src/app/pages/account/Dashboard.jsx'
$content = Get-Content $path -Raw
# Replace the text back to normal
$content = $content -replace 'Vào phòng phỏng vấn \(TEST\)', 'Vào phòng phỏng vấn'
# Add the onClick handler
$oldClass = 'shadow-\[0_10px_30px_rgba\(232,121,249,0.2\)\]\"'
$newClassWithClick = 'shadow-[0_10px_30px_rgba(232,121,249,0.2)]" onClick={() => navigate(`/meeting/${s.sessionId || s.backendId || s.id}`)}'
$content = $content -replace $oldClass, $newClassWithClick
Set-Content $path $content -NoNewline
