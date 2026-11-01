// Read-only cards projected from the existing ledger; never invent payment dates.
import {feeStatement} from './admin-fee-statement-model.js?v=20261024-admin-9';
import {escapeHTML as e,money,dateLabel} from './admin-feature-model.js?v=20261101-fees-2';
export function monthlyStatusHTML(entry,asOf){
 const statement=feeStatement(entry,asOf);
 if(!statement.reliable)return `<section class="monthly-status"><h3>Monthly fee status</h3><p>Review this student's billing details before relying on a balance.</p>${statement.warnings.map(w=>`<p>${e(w)}</p>`).join('')}</section>`;
 return `<section class="monthly-status"><header><div><small>REHAAN · MONTHLY TUITION</small><h3>Monthly fee status</h3><p>${e(statement.student.name)} · ADM ${e(statement.student.admission)}</p></div><span>₹999 / month</span></header><div class="monthly-status-cards">${statement.rows.map(row=>{
 const state=row.balance===0?'paid':row.paid>0?'partial':row.upcoming?'upcoming':'overdue',label={paid:'Paid',partial:'Part paid',upcoming:'Upcoming',overdue:row.key===statement.asOf?'Due today':'Overdue'}[state];
 return `<article class="monthly-status-card is-${state}" data-monthly-due="${row.key}"><span class="monthly-status-icon" aria-hidden="true">${state==='paid'?'✓':state==='partial'?'◷':state==='upcoming'?'▦':'!'}</span><h4>${e(row.label)}</h4><span class="monthly-status-badge">${label}</span><strong>${money(row.paid>0?row.paid:row.billed)}${row.paid>0?'<small> received</small>':''}</strong><p>${row.balance?'<b>'+money(row.balance)+' remaining</b>':'Balance '+money(0)}</p><small>Due ${dateLabel(row.key)}${row.upcoming&&row.paid>0?' · paid in advance':''}</small>${row.paid>0&&row.balance>0&&row.key<statement.asOf?'<small class="monthly-status-late">Overdue balance</small>':''}${row.credit?`<small>Credit to review: ${money(row.credit)}</small>`:''}</article>`;
 }).join('')}</div><p class="monthly-status-note">Fee months name the learning month; payment is due on the following admission anniversary. These cards use your recorded ledger. Admission fee is separate.</p></section>`;
}
