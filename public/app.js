async function submitForm(form, endpoint, statusEl){
  const data = Object.fromEntries(new FormData(form).entries());
  statusEl.textContent = "Sending...";
  try{
    const r = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    const j = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error || "Submission failed");
    statusEl.textContent = j.message || "Submitted successfully.";
    form.reset();
  }catch(e){ statusEl.textContent = e.message; }
}
document.getElementById("contactForm").addEventListener("submit",e=>{e.preventDefault();submitForm(e.currentTarget,"/api/contact",document.getElementById("contactStatus"))});
document.getElementById("workForm").addEventListener("submit",e=>{e.preventDefault();submitForm(e.currentTarget,"/api/work",document.getElementById("workStatus"))});
document.getElementById("lang").addEventListener("change",e=>{
  if(e.target.value==="ar") alert("Arabic selector is ready for expansion. The current public content is English by default.");
  localStorage.setItem("dark_lang",e.target.value);
});