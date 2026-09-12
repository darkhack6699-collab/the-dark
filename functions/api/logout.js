export async function onRequestPost({ request, env }) {
  try {
    const cookieHeader = request.headers.get("Cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)dark_session=([^;]+)/);
    const token = match ? match[1] : null;

    if (token) {
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token)
      );

      const sessionId = btoa(
        String.fromCharCode(...new Uint8Array(hash))
      )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await env.DB
        .prepare("DELETE FROM sessions WHERE id = ?")
        .bind(sessionId)
        .run();
    }

    return new Response(
      JSON.stringify({
        message: "Logged out successfully."
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie":
            "dark_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
        }
      }
    );

  } catch (error) {
    console.error("Logout error:", error);

    return Response.json(
      { error: "Logout failed." },
      { status: 500 }
    );
  }
}
