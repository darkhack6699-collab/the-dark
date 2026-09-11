const LIMIT = 5, WINDOW = 3600;
function clean(v,max=4000){return String(v??"").trim().replace(/[<>]/g,"").slice(0,max)}
function email(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
export async function onRequestPost({request,env}){
  const ip=request.headers.get("CF-Connecting-IP")||"unknown";
  const b=await request.json().catch(()=>null); if(!b)return Response.json({error:"Invalid request."},{status:400});
  if(clean(b.website,200))return Response.json({message:"Thanks."});
  const clientName=clean(b.clientName,120), e=clean(b.email,254), type=clean(b.typeOfWork,120), desc=clean(b.projectDescription,4000), budget=clean(b.budget,100), msg=clean(b.message,4000);
  if(!clientName||!email(e)||!type||!desc||!msg)return Response.json({error:"Please complete all required fields correctly."},{status:400});
  const now=Math.floor(Date.now()/1000), key=`work:${ip}:${Math.floor(now/WINDOW)}`, count=await env.RATE_LIMIT?.get(key);
  if(Number(count||0)>=LIMIT)return Response.json({error:"Too many submissions. Please try again later."},{status:429});
  await env.RATE_LIMIT?.put(key,String(Number(count||0)+1),{expirationTtl:WINDOW+60});
  await env.DB.prepare("INSERT INTO messages(type,name,email,subject,message,created_at) VALUES(?,?,?,?,?,datetime('now'))").bind("work",clientName,e,type,`Project: ${desc}\nBudget: ${budget}\nMessage: ${msg}`).run();
  if(env.RESEND_API_KEY){
    await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({
      from:env.MAIL_FROM||"The Dark <onboarding@resend.dev>",to:["dark.hack6699@gmail.com"],
      subject:`Work With Me Request: ${type}`,
      text:`Client: ${clientName}\nEmail: ${e}\nType: ${type}\nProject Description:\n${desc}\nBudget: ${budget}\nMessage:\n${msg}\nSubmitted: ${new Date().toISOString()}`
    })});
  }
  return Response.json({message:"Request received. Thank you."});
}