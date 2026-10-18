// In-memory sample model only. No networking, storage, SDKs or real records.
export const MONTHLY_FEE = 99900;
export const SAMPLE_PERIOD = '2026-10';
export const SUBJECTS = ['Computer fundamentals', 'Office applications', 'Practical assessment'];
export function indiaDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
}
export function money(paise) { return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:paise%100 ? 2 : 0,maximumFractionDigits:2}).format(paise/100); }
export function dateLabel(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value||'') ? new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(value+'T00:00:00+05:30')) : '—'; }
export function monthLabel(value) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(value||'') ? new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(value+'-01T00:00:00+05:30')) : '—'; }
export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function parseAmount(value) {
    const text = String(value).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text)) throw Error('Enter a positive amount with no more than two decimal places.');
    const [whole,decimal=''] = text.split('.');
    const paise = Number(whole)*100+Number(decimal.padEnd(2,'0'));
    if (!Number.isSafeInteger(paise) || paise<=0) throw Error('Payment amount must be greater than zero.');
    return paise;
}
export function createState() {
    const students = [
        {id:'demo-001',name:'Ayaan Demo',admission:'DEMO/001',roll:'RC-001',parent:'Sample guardian',phone:'',course:'Computer Diploma',batch:'Morning',gender:'male',joined:'2026-09-01',end:'2027-08-31',periods:[SAMPLE_PERIOD]},
        {id:'demo-002',name:'Sara Demo',admission:'DEMO/002',roll:'RC-002',parent:'Sample guardian',phone:'',course:'Office Applications',batch:'Afternoon',gender:'female',joined:'2026-08-01',end:'2027-01-31',periods:[SAMPLE_PERIOD]},
        {id:'demo-003',name:'Zoya Demo',admission:'DEMO/003',roll:'RC-003',parent:'Sample guardian',phone:'',course:'Computer Diploma',batch:'Morning',gender:'female',joined:'2026-09-01',end:'2027-08-31',periods:[SAMPLE_PERIOD]}
    ];
    const state = {students,payments:[],events:[],nextReceipt:1,nextEvent:1,exam:{title:'Term assessment · October 2026',date:'2026-10-17',passPercent:33,subjects:SUBJECTS.map(name=>({name,max:100}))},scores:{'demo-001':[76,84,91],'demo-002':[95,92,96],'demo-003':[65,71,28]}};
    recordPayment(state,{studentId:'demo-001',period:SAMPLE_PERIOD,amount:'200',date:'2026-10-05',method:'Cash',note:'Sample opening payment'});
    recordPayment(state,{studentId:'demo-002',period:SAMPLE_PERIOD,amount:'999',date:'2026-10-06',method:'UPI',note:'Sample opening payment'});
    return state;
}
export function billFor(state,id,period) {
    const student = state.students.find(item=>item.id===id);
    if (!student) throw Error('Student not found in this sample workspace.');
    const billed = student.periods.includes(period) ? MONTHLY_FEE : 0;
    const received = state.payments.filter(item=>item.studentId===id && item.period===period).reduce((sum,item)=>sum+item.amount,0);
    return {billed,received,balance:Math.max(0,billed-received)};
}
export function logEvent(state,kind,title,student,changes={}) {
    const event = {id:'EVT-'+String(state.nextEvent++).padStart(4,'0'),kind,title,student:student||'Workspace',actor:'Dar Yasir · sample admin',at:new Date().toISOString(),changes:structuredClone(changes)};
    state.events.unshift(event);return event;
}
export function recordPayment(state,input) {
    const student=state.students.find(item=>item.id===input.studentId);
    if (!student) throw Error('Select a sample student.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period||'')) throw Error('Choose a valid fee month.');
    const amount=parseAmount(input.amount);
    const date=input.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date||'') || new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date || date>indiaDate()) throw Error('Choose a valid payment date that is not in the future.');
    if (!['Cash','UPI','Bank transfer'].includes(input.method)) throw Error('Choose a recorded payment method.');
    const bill=billFor(state,student.id,input.period);
    if (!bill.billed) throw Error('No sample fee is scheduled for that month.');
    if (amount>bill.balance) throw Error(`Amount exceeds the remaining ${money(bill.balance)}. No payment was recorded.`);
    const receipt={id:'payment-'+state.nextReceipt,number:'DEMO-RC-'+String(state.nextReceipt++).padStart(4,'0'),studentId:student.id,student:structuredClone(student),period:input.period,date,method:input.method,note:String(input.note||'').trim().slice(0,300),amount,billed:bill.billed,receivedAtIssue:bill.received+amount,balanceAtIssue:bill.balance-amount};
    state.payments.push(receipt);
    logEvent(state,'payment','Payment recorded',student.name,{'Receipt':receipt.number,'Fee month':monthLabel(receipt.period),'Received now':money(amount),'Previously received':money(bill.received),'Total received':money(receipt.receivedAtIssue),'Balance after payment':money(receipt.balanceAtIssue)});
    return receipt;
}
export function whatsappText(state,receipt) {
    const current=billFor(state,receipt.studentId,receipt.period);
    return ['*REHAAN COMPUTERS*','Charangam, Beerwah, Kashmir','','*FEE PAYMENT ACKNOWLEDGEMENT*',`Student: ${receipt.student.name}`,`Admission no.: ${receipt.student.admission}`,`Receipt no.: ${receipt.number}`,`Payment date: ${dateLabel(receipt.date)}`,`Fee month: ${monthLabel(receipt.period)}`,`Amount received: ${money(receipt.amount)}`,`Payment method: ${receipt.method}`,`Total received for this month: ${money(current.received)}`,`Current remaining balance: ${money(current.balance)}`,`Balance checked on: ${dateLabel(indiaDate())}`,'',current.balance===0?'This month’s fee is fully received. Thank you.':'Please keep this acknowledgement for your records.','','DESIGN PREVIEW — sample information only.'].join('\n');
}
export function reportFor(state,period) {
    const rows=state.students.filter(student=>student.periods.includes(period)).map(student=>({...student,...billFor(state,student.id,period)}));
    return {rows,billed:rows.reduce((sum,row)=>sum+row.billed,0),received:rows.reduce((sum,row)=>sum+row.received,0),balance:rows.reduce((sum,row)=>sum+row.balance,0)};
}
export function examResult(state,id) {
    const marks=state.scores[id]||[];const subjects=state.exam.subjects;
    const complete=marks.length===subjects.length && subjects.every((subject,index)=>typeof marks[index]==='number' && Number.isFinite(marks[index]) && marks[index]>=0 && marks[index]<=subject.max);
    const maximum=subjects.reduce((sum,subject)=>sum+subject.max,0);
    const total=complete?marks.reduce((sum,mark)=>sum+mark,0):null;
    const percentage=complete?Math.round(total/maximum*10000)/100:null;
    const passed=complete && subjects.every((subject,index)=>marks[index]/subject.max*100>=state.exam.passPercent);
    const grade=!complete?'Incomplete':!passed?'Not passed':percentage>=90?'A+':percentage>=75?'A':percentage>=60?'B':percentage>=45?'C':'D';
    return {complete,total,maximum,percentage,passed,grade,marks:[...marks]};
}
export function updateScores(state,id,values) {
    if (!state.students.some(student=>student.id===id)) throw Error('Select a sample student.');
    if (!Array.isArray(values)||values.length!==state.exam.subjects.length) throw Error('Complete all assessment rows.');
    const marks=values.map((value,index)=>{
        if (value===''||value===null)return null;
        const number=Number(value);
        if (!Number.isFinite(number)||number<0||number>state.exam.subjects[index].max) throw Error(`Enter marks from 0 to ${state.exam.subjects[index].max} for ${state.exam.subjects[index].name}.`);
        return number;
    });
    const before=state.scores[id]||[];state.scores[id]=marks;
    logEvent(state,'academic','Assessment updated',state.students.find(student=>student.id===id).name,{Before:before.map(value=>value??'Unmarked').join(' / '),After:marks.map(value=>value??'Unmarked').join(' / ')});
    return examResult(state,id);
}
export function csvCell(value) { let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'; }
export function parseCSV(text) {
    if (typeof text!=='string'||text.length>2*1024*1024)throw Error('Choose a CSV file smaller than 2 MB.');
    text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
    for(let i=0;i<text.length;i++){
        const char=text[i];
        if(quoted){if(char==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=char;continue;}
        if(char==='"'){if(cell.length||closed)throw Error('A CSV quote is misplaced. Use the supplied template.');quoted=true;continue;}
        if(char===','||char==='\r'||char==='\n'){
            row.push(cell);cell='';closed=false;
            if(char!==','){if(char==='\r'&&text[i+1]==='\n')i++;if(row.some(value=>value.trim()))rows.push(row);row=[];}
        }else{if(closed)throw Error('Unexpected text after a closing CSV quote.');cell+=char;}
    }
    if(quoted)throw Error('A CSV field has an unclosed quote.');
    row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
    if(rows.length<2)throw Error('The CSV needs a header and at least one student row.');
    if(rows.length>1001)throw Error('Preview supports up to 1,000 rows per file.');
    const expected=['admission_number','name','phone','course','batch','gender'];const headers=rows.shift().map(value=>value.trim().toLowerCase());
    if(headers.length!==expected.length||new Set(headers).size!==headers.length||expected.some(header=>!headers.includes(header)))throw Error('Use these six template columns: admission_number, name, phone, course, batch, gender. Payment and status columns are not accepted.');
    return rows.map((values,index)=>({row:index+2,values:Object.fromEntries(headers.map((key,column)=>[key,(values[column]||'').trim()])),columnError:values.length!==headers.length}));
}
export function reviewImport(state,text) {
    const rows=parseCSV(text);const seen=new Set(state.students.map(student=>student.admission.toUpperCase()));
    return rows.map(row=>{
        const value=row.values;const errors=[];const admission=value.admission_number.toUpperCase();
        if(row.columnError)errors.push('Wrong number of columns');
        if(!/^[A-Z0-9/_-]{1,20}$/.test(admission))errors.push('Invalid admission number');
        if(seen.has(admission))errors.push('Duplicate admission number');
        seen.add(admission);
        if(value.name.length<2||value.name.length>120||/^[=+@-]/.test(value.name))errors.push('Name must contain 2–120 ordinary text characters');
        if(!/^\d{10}$/.test(value.phone))errors.push('Phone must contain 10 digits');
        if(!value.course||value.course.length>120)errors.push('Course is required');
        if(!value.batch||value.batch.length>40)errors.push('Batch is required');
        if(value.gender&&!['male','female','other','prefer_not_to_say'].includes(value.gender.toLowerCase()))errors.push('Unrecognized gender');
        return {...row,values:{...value,admission_number:admission,gender:value.gender.toLowerCase()},errors};
    });
}
export function commitImport(state,text,period) {
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period||''))throw Error('Choose a first fee month.');
    const review=reviewImport(state,text);const accepted=review.filter(row=>!row.errors.length);
    if(!accepted.length)throw Error('There are no valid new sample rows to import.');
    for(const row of accepted){const value=row.values;state.students.push({id:'import-'+value.admission_number,name:value.name,admission:value.admission_number,roll:value.admission_number,parent:'',phone:value.phone,course:value.course,batch:value.batch,gender:value.gender,joined:indiaDate(),end:'',periods:[period],feeReview:true});}
    logEvent(state,'import','Student import completed','Workspace',{'New sample students':accepted.length,'Rows not imported':review.length-accepted.length,'Opening payments':'None — fees require review'});
    return accepted.length;
}
