// O que uma tecla faz com o recado (T07 research §5; T08: specs/008-recado-segue-cursor/research.md
// §5). O navegador só entrega teclas à aba em foco, então "a aba do Telão está em foco" já é garantido.

const TIPOS_DE_INPUT_SEM_TEXTO = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

// Elementos onde `/` deve ser escrito normalmente (ex.: o campo de nome).
export function ehCampoDeTexto(elemento) {
  if (!elemento) return false;
  if (elemento.isContentEditable) return true;
  if (elemento.tagName === "TEXTAREA" || elemento.tagName === "SELECT") return true;
  if (elemento.tagName === "INPUT") return !TIPOS_DE_INPUT_SEM_TEXTO.has(elemento.type);
  return false;
}

// Teclas que mudam o texto mesmo sem `key` de um caractere. "Dead" é a primeira tecla de um acento
// (tecla morta): sem ela, o "´" de "é" se perderia ao voltar ao campo.
const TECLAS_DE_EDICAO = new Set(["Backspace", "Delete", "Dead"]);

function escreve({ key }) {
  return key.length === 1 || TECLAS_DE_EDICAO.has(key);
}

// `estado`: { alvoEhCampoDeTexto, campoAberto, temDestaque, pontoNaImagem } — o ponto é o do último
// ponteiro sobre a imagem em destaque, ou null se ele está fora dela.
// Devolve "abrir" (novo campo), "voltarAoCampo" (a tecla vai para o campo aberto, que perdeu o
// foco), "apagar" (Esc com o campo sem foco) ou null (a tecla segue o caminho normal).
// `key` (e não `code`) respeita o layout do teclado: no ABNT2, `/` fica em outra tecla.
export function acaoDaTecla(
  evento,
  { alvoEhCampoDeTexto, campoAberto, temDestaque, pontoNaImagem },
) {
  // Num campo de texto (o próprio recado ou o nome), a tecla é dele.
  if (alvoEhCampoDeTexto) return null;
  const comAtalho = evento.ctrlKey || evento.altKey || evento.metaKey;
  if (campoAberto) {
    // Enquanto o recado aparece, o campo continua ativo: até `/` é texto (T08 FR-009).
    if (evento.key === "Escape") return "apagar";
    if (comAtalho || !escreve(evento)) return null;
    return "voltarAoCampo";
  }
  if (evento.key !== "/" || comAtalho || evento.repeat) return null;
  return temDestaque && pontoNaImagem !== null ? "abrir" : null;
}
