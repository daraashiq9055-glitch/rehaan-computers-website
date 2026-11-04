// Pure URL builders. Opening WhatsApp never sends a message or changes a record.
export function studentWhatsAppURL(phone,message=''){
 let digits=String(phone||'').replace(/[^0-9]/g,'');
 if(digits.startsWith('0091')&&digits.length===14)digits=digits.slice(4);
 else if(digits.startsWith('91')&&digits.length===12)digits=digits.slice(2);
 if(!/^[6-9][0-9]{9}$/.test(digits))return null;
 return 'https://wa.me/91'+digits+'?text='+encodeURIComponent(String(message));
}
export function studentChatURL(data){return studentWhatsAppURL(data.phone,'Hello '+(data.fullName||'Student')+', this is Rehaan Computers. We would like to speak with you about your course.');}
