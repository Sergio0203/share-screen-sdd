// Conjunto único de ícones da interface (T09, research §2). Os desenhos são do Lucide
// (https://lucide.dev), copiados como dados para não depender de pacote nem de serviço externo.
//
// Lucide — ISC License
// Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
// All other copyright (c) for Lucide are held by Lucide Contributors 2022.
// Permission to use, copy, modify, and/or distribute this software for any purpose with or without
// fee is hereby granted, provided that the above copyright notice and this permission notice appear
// in all copies.
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
// SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
// AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
// NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE
// OF THIS SOFTWARE.

const SVG_NS = "http://www.w3.org/2000/svg";

const linha = (x1, y1, x2, y2) => ["line", { x1, y1, x2, y2 }];
const caminho = (d) => ["path", { d }];

// Nome → elementos do desenho ([tag, atributos]), numa grade de 24×24.
export const ICONES = {
  // Lucide "mic"
  microfone: [
    caminho("M12 19v3"),
    caminho("M19 10v2a7 7 0 0 1-14 0v-2"),
    ["rect", { x: 9, y: 2, width: 6, height: 13, rx: 3 }],
  ],
  // Lucide "mic-off"
  "microfone-desligado": [
    linha(2, 2, 22, 22),
    caminho("M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"),
    caminho("M5 10v2a7 7 0 0 0 12 5"),
    caminho("M15 9.34V5a3 3 0 0 0-5.68-1.33"),
    caminho("M9 9v3a3 3 0 0 0 5.12 2.12"),
    linha(12, 19, 12, 22),
  ],
  // Lucide "video"
  camera: [
    caminho("m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"),
    ["rect", { x: 2, y: 6, width: 14, height: 12, rx: 2 }],
  ],
  // Lucide "video-off"
  "camera-desligada": [
    caminho("M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"),
    caminho("M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"),
    caminho("m2 2 20 20"),
  ],
  // Lucide "monitor"
  monitor: [
    ["rect", { x: 2, y: 3, width: 20, height: 14, rx: 2 }],
    linha(8, 21, 16, 21),
    linha(12, 17, 12, 21),
  ],
  // Lucide "monitor-off"
  "monitor-parar": [
    caminho("M17 17H4a2 2 0 0 1-2-2V5c0-1.5 1-2 1-2"),
    caminho("M22 15V5a2 2 0 0 0-2-2H9"),
    caminho("M8 21h8"),
    caminho("M12 17v4"),
    caminho("m2 2 20 20"),
  ],
  // Lucide "maximize"
  "tela-cheia": [
    caminho("M8 3H5a2 2 0 0 0-2 2v3"),
    caminho("M21 8V5a2 2 0 0 0-2-2h-3"),
    caminho("M3 16v3a2 2 0 0 0 2 2h3"),
    caminho("M16 21h3a2 2 0 0 0 2-2v-3"),
  ],
  // Lucide "sliders-horizontal"
  qualidade: [
    linha(21, 4, 14, 4),
    linha(10, 4, 3, 4),
    linha(21, 12, 12, 12),
    linha(8, 12, 3, 12),
    linha(21, 20, 16, 20),
    linha(12, 20, 3, 20),
    linha(14, 2, 14, 6),
    linha(8, 10, 8, 14),
    linha(16, 18, 16, 22),
  ],
  // Lucide "copy"
  copiar: [
    ["rect", { x: 8, y: 8, width: 14, height: 14, rx: 2, ry: 2 }],
    caminho("M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"),
  ],
  // Lucide "volume-2"
  som: [
    caminho(
      "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
    ),
    caminho("M16 9a5 5 0 0 1 0 6"),
    caminho("M19.364 18.364a9 9 0 0 0 0-12.728"),
  ],
  // Lucide "crown"
  coroa: [
    caminho(
      "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
    ),
    caminho("M5 21h14"),
  ],
  // Lucide "users"
  usuarios: [
    caminho("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"),
    ["circle", { cx: 9, cy: 7, r: 4 }],
    caminho("M22 21v-2a4 4 0 0 0-3-3.87"),
    caminho("M16 3.13a4 4 0 0 1 0 7.75"),
  ],
  // Lucide "circle-alert"
  alerta: [["circle", { cx: 12, cy: 12, r: 10 }], linha(12, 8, 12, 12), linha(12, 16, 12.01, 16)],
  // Lucide "circle-check"
  sucesso: [["circle", { cx: 12, cy: 12, r: 10 }], caminho("m9 12 2 2 4-4")],
  // Lucide "arrow-right"
  "seta-direita": [caminho("M5 12h14"), caminho("m12 5 7 7-7 7")],
  // Lucide "rotate-ccw"
  recarregar: [caminho("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"), caminho("M3 3v5h5")],
  // Lucide "loader-circle"
  carregando: [caminho("M21 12a9 9 0 1 1-6.219-8.56")],
};

// Monta o <svg> do ícone. É decorativo (`aria-hidden`): o nome da ação fica no botão
// (`aria-label` ou texto), para o leitor de tela não anunciar duas vezes (T09 US2).
export function criarIcone(nome) {
  const elementos = ICONES[nome];
  if (!elementos) throw new Error(`Ícone desconhecido: ${nome}`);
  const svg = document.createElementNS(SVG_NS, "svg");
  const atributos = {
    class: "icone",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    focusable: "false",
  };
  for (const [chave, valor] of Object.entries(atributos)) svg.setAttribute(chave, valor);
  for (const [tag, atributosDoElemento] of elementos) {
    const filho = document.createElementNS(SVG_NS, tag);
    for (const [chave, valor] of Object.entries(atributosDoElemento)) {
      filho.setAttribute(chave, valor);
    }
    svg.append(filho);
  }
  return svg;
}
