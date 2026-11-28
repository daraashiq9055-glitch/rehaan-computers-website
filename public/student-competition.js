const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rankPanel(stats,moved){
 return `<aside class="my-week-rank${moved?' rank-moved':''}"><small>My Weekly Rank</small>
  <strong>${stats?.rank?'#'+stats.rank:'—'}</strong><span>${stats?.rank?stats.weeklyTotal+' weekly points':'Awaiting first score'}</span>
  ${stats?.open?'<small class="rank-live">● Live</small>':''}</aside>`;
}
export function standingsPanel(stats){
 const rows=stats?.students||[];
 const row=r=>`<li class="metal-place-${r.rank} ${r.mine?'my-place':''}"><b>#${r.rank}</b><span>${esc(r.name)}${r.mine?' · You':''}</span><strong>${r.score} pts</strong></li>`;
 return `<section class="weekly-standings"><header><h3>Competition leaderboard</h3><small>${stats?.week?'Week of '+esc(stats.week):''}</small></header>
  <ol>${rows.slice(0,10).map(row).join('')}</ol>${!rows.length?'<p>Awaiting the first score.</p>':''}
  <details><summary>Full standings · ${rows.length} participants</summary><p>Equal scores are ordered by earliest last submission, then account ID.</p><ol>${rows.map(row).join('')}</ol></details></section>`;
}
export function achievements(stats){
 if(!stats)return '';
 const badges=['Learner','Bronze','Silver','Gold','Platinum','Diamond'];
 return `<div class="milestone-strip">${badges.map((b,i)=>`<span class="tier tier-${i} ${stats.badges?.includes(b)?'earned':''}">${b}</span>`).join('')}</div>
 <p>${stats.points} verified points · ${stats.next?`${stats.next.remaining} to ${esc(stats.next.name)} (${stats.next.threshold})`:'Diamond reached'}</p>
 ${(stats.podium||[]).map(p=>`<small class="podium-reward metal-place-${p.rank}">${['Gold','Silver','Bronze'][p.rank-1]} podium · ${esc(p.week)}</small>`).join('')}`;
}
