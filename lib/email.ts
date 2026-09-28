export async function sendPasswordResetEmail(to: string, link: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY ou EMAIL_FROM ausente");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Redefinição de senha",
      text: `Recebemos um pedido para redefinir sua senha. Acesse o link abaixo (válido por 1 hora):\n\n${link}\n\nSe não foi você, ignore este e-mail.`,
      html: `<p>Recebemos um pedido para redefinir sua senha.</p>
<p><a href="${link}">Clique aqui para criar uma nova senha</a> (válido por 1 hora).</p>
<p>Se não foi você, ignore este e-mail.</p>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}