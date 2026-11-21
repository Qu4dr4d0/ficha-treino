// Teste: ler fichas de treino (foto/print) com Claude Haiku 5.5 e devolver JSON no formato do app.
// Uso: ANTHROPIC_API_KEY=... node testa.mjs fotos/*.png
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const Exercise = z.object({
  name: z.string().describe("Nome do exercício como está na ficha, com a grafia corrigida (acentos, maiúsculas)"),
  sets: z.number().int().describe("Total de séries válidas. '1, 2, 2' ou '2, 1' = soma"),
  repsMin: z.number().int().nullable().describe("Repetições mínimas. '10 a 12' = 10; '15' = 15"),
  repsMax: z.number().int().nullable().describe("Repetições máximas. '10 a 12' = 12; '15' = 15"),
  loadKg: z.number().nullable().describe("Carga em kg só se a ficha disser kg; senão null"),
  restSec: z.number().int().nullable().describe("Descanso em segundos. '1:30 min' = 90; '3 min' = 180; null se não houver"),
  note: z.string().nullable().describe("Tudo da linha que não coube nos outros campos: carga em escala 7/10, técnica, 'cada série', 'até a falha', variações. Curto. null se nada"),
});
const Workout = z.object({
  title: z.string().describe("Nome do treino: 'Treino A - Perna', 'Upper A'. Junte letra e grupo muscular"),
  day: z.enum(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo", ""]).describe("Dia da semana se a ficha disser; senão vazio"),
  exercises: z.array(Exercise),
});
const Plan = z.object({
  workouts: z.array(Workout),
  cut: z.boolean().describe("true se a imagem parece cortada (tabela continua fora da foto)"),
  warnings: z.array(z.string()).describe("Dúvidas curtas para o usuário conferir, em português. Vazio se nada"),
});

const SYSTEM = `Você lê fichas de treino de academia (foto, print de planilha, post de rede social) e transcreve para dados estruturados.
Regras:
- Transcreva só o que está na imagem. Não invente exercícios, séries, cargas ou descansos.
- Cada bloco/treino da ficha (Treino A, B, Segunda, Upper...) vira um item em workouts, na ordem da imagem.
- Se a imagem tiver só um treino sem nome, use o título da imagem (ex.: 'Bíceps e Tríceps').
- Se a ficha não tiver repetições, deixe repsMin e repsMax null.
- Corrija grafia óbvia (Triceps -> Tríceps, maquina -> Máquina) sem mudar o exercício.
- Use warnings para avisar de partes ilegíveis, cortadas ou ambíguas.`;

const client = new Anthropic();
const files = process.argv.slice(2);
let total = { in: 0, out: 0 };
for (const f of files) {
  const t0 = Date.now();
  const res = await client.messages.parse({
    model: "claude-haiku-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Plan) },
    system: SYSTEM,
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: "image/png", data: fs.readFileSync(f).toString("base64") } },
      { type: "text", text: "Transcreva esta ficha de treino." },
    ] }],
  });
  const u = res.usage; total.in += u.input_tokens; total.out += u.output_tokens;
  const cost = (u.input_tokens * 0.10 + u.output_tokens * 0.50) / 1e6;
  const out = { file: path.basename(f), stop: res.stop_reason, secs: (Date.now() - t0) / 1000, usage: { in: u.input_tokens, out: u.output_tokens }, usd: +cost.toFixed(5), plan: res.parsed_output };
  fs.writeFileSync(f.replace(/\.png$/, ".json"), JSON.stringify(out, null, 1));
  console.log(`${out.file}: ${out.stop} ${out.secs}s in=${u.input_tokens} out=${u.output_tokens} US$${out.usd}`);
}
console.log(`total US$${((total.in * 0.10 + total.out * 0.50) / 1e6).toFixed(5)}`);
