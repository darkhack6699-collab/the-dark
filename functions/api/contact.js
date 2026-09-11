const LIMIT = 5;
const WINDOW = 60 * 60;

function clean(v, max=4000){ return String(v ?? "").trim().replace(/[<>]/g,"").slice(0,max); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export async function onRequestPost({request, env}){
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const body = await request.json().catch(()=>null);
  if(!body) return Response.json({error:"Invalid request."},{status:400});
  if(clean(body.website,200)) return Response.json({message:"Thanks."});
  const name=clean(body.name,120), email=clean(body.email,254), subject=clean(body.subject,200), message=clean(body.message,4000);
  if(!name || !validEmail(email) || !subject || !message) return Response.json({error:"Please complete all fields correctly."},{status:400});
  const now=Math.floor(Date.now()/1000);
  const key=`contact:${ip}:${Math.floor(now/WINDOW)}`;
  const count=await env.RATE_LIMIT?.get(key);
  if(Number(count||0)>=LIMIT) return Response.json({error:"Too many submissions. Please try again later."},{status:429});
  await env.RATE_LIMIT?.put(key,String(Number(count||0)+1),{expirationTtl:WINDOW+60});
  await env.DB.prepare("INSERT INTO messages(type,name,email,subject,message,created_at) VALUES(?,?,?,?,?,datetime('now'))").bind("contact",name,email,subject,message).run();
  if(env.RESEND_API_KEY){
    await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({
      from: env.MAIL_FROM || "The Dark <onboarding@resend.dev>",
      to:["dark.hack6699@gmail.com"], subject:`Contact Me: ${subject}`,
      text:`Sender: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage:\n${message}\nSubmitted: ${new Date().toISOString()}`
    })});
  }
  return Response.json({message:"Message received. Thank you."});
}