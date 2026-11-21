// Edge Function do Supabase: recebe a foto/print (ou texto) de uma ficha de treino,
// pede ao Claude Haiku 5.5 para transcrever e devolve os treinos em JSON.
// A chave da Anthropic fica no segredo ANTHROPIC_API_KEY do projeto; nunca vai para o app.
// Só atende usuário logado, com limite diário por pessoa (tabela import_usage).
import Anthropic from "npm:@anthropic-ai/sdk";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { z } from "npm:zod";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_PER_DAY = Number(Deno.env.get("IMPORT_MAX_PER_DAY") || 20);
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://qu4dr4d0.github.io").split(",");
const MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const Exercise = z.object({
  name: z.string().describe("Nome do exercício como está na ficha, com a grafia corrigida (acentos, maiúsculas)"),
  sets: z.number().int().describe("Total de séries válidas. '1, 2, 2' ou '2, 1' = soma"),
  repsMin: z.number().int().nullable().describe("Repetições mínimas. '10 a 12' = 10; '15' = 15"),
  repsMax: z.number().int().nullable().describe("Repetições máximas. '10 a 12' = 12; '15' = 15"),
  loadKg: z.number().nullable().describe("Carga em kg só se a ficha disser kg; senão null"),
  restSec: z.number().int().nullable().describe("Descanso em segundos. '1:30 min' = 90; '3 min' = 180; null se não houver"),
  note: z.string().nullable().describe("O que não coube nos outros campos: carga em escala 7/10, técnica, 'cada série', 'até a falha'. Curto. null se nada"),
});
const Workout = z.object({
  title: z.string().describe("Nome do treino sem o dia da semana: 'Treino A - Perna', 'Upper A'"),
  day: z.enum(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo", ""]).describe("Dia da semana se a ficha disser; senão vazio"),
  exercises: z.array(Exercise),
});
const Plan = z.object({
  workouts: z.array(Workout),
  cut: z.boolean().describe("true se a imagem parece cortada (tabela continua fora da foto)"),
  warnings: z.array(z.string()).describe("Dúvidas curtas para o usuário conferir, em português. Vazio se nada"),
});

const SYSTEM = `Você lê fichas de treino de academia (foto, print de planilha, post de rede social ou texto colado) e transcreve para dados estruturados.
Regras:
- Transcreva só o que está na ficha. Não invente exercícios, séries, cargas ou descansos.
- Cada bloco/treino da ficha (Treino A, B, Segunda, Upper...) vira um item em workouts, na ordem da ficha.
- O dia da semana vai só no campo day, nunca no título.
- Se houver só um treino sem nome, use o título da ficha (ex.: 'Bíceps e Tríceps').
- Se a ficha não tiver repetições, deixe repsMin e repsMax null.
- Corrija grafia óbvia (Triceps -> Tríceps, maquina -> Máquina) e use maiúscula no início de cada palavra principal do nome do exercício, sem mudar o exercício.
- Se não for uma ficha de treino, devolva workouts vazio e explique em warnings.
- Use warnings para avisar de partes ilegíveis, cortadas ou ambíguas.`;

const anthropic = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

function cors(origin: string | null) {
  const ok = origin && ALLOWED_ORIGINS.some((o) => o.trim() === origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, "content-type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST") return json({ error: "método" }, 405);

  // usuário logado (o token do app vem no Authorization)
  const auth = req.headers.get("authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: who } = await sb.auth.getUser();
  if (!who?.user) return json({ error: "login" }, 401);

  let body: { image?: string; media_type?: string; text?: string };
  try { body = await req.json(); } catch { return json({ error: "corpo inválido" }, 400); }
  const hasImage = typeof body.image === "string" && body.image.length > 0;
  const hasText = typeof body.text === "string" && body.text.trim().length > 0;
  if (!hasImage && !hasText) return json({ error: "mande uma imagem ou um texto" }, 400);
  if (hasImage && (!MEDIA.includes(body.media_type as typeof MEDIA[number]) || body.image!.length > 7_000_000)) return json({ error: "imagem inválida ou grande demais" }, 400);
  if (hasText && body.text!.length > 20_000) return json({ error: "texto grande demais" }, 400);

  // limite diário (conta antes de chamar o Claude)
  const { data: lim, error: limErr } = await sb.rpc("bump_import", { max_per_day: MAX_PER_DAY });
  if (limErr) return json({ error: "limite indisponível" }, 500);
  if (!lim?.ok) return json({ error: lim?.reason === "limite" ? `limite de ${MAX_PER_DAY} importações por dia` : "login" }, lim?.reason === "limite" ? 429 : 401);

  const content: Anthropic.ContentBlockParam[] = hasImage
    ? [{ type: "image", source: { type: "base64", media_type: body.media_type as typeof MEDIA[number], data: body.image! } }, { type: "text", text: "Transcreva esta ficha de treino." }]
    : [{ type: "text", text: `Transcreva esta ficha de treino:\n\n<ficha>\n${body.text}\n</ficha>` }];

  try {
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(Plan) },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") return json({ error: "a ficha não pôde ser lida" }, 422);
    if (res.stop_reason === "max_tokens" || !res.parsed_output) return json({ error: "ficha grande demais para ler de uma vez" }, 422);
    return json({ plan: res.parsed_output, used: lim.used, max: lim.max });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "muitas leituras agora, tente em 1 minuto" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "falha ao ler a ficha" }, 502);
    throw e;
  }
});
