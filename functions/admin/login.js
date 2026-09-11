// Minimal admin-login example. For production, use an external identity provider
// or Cloudflare Access rather than storing passwords in application code.
export async function onRequestPost({request,env}){
  return Response.json({error:"Admin authentication is intentionally not enabled until you configure an identity provider/secret."},{status:501});
}