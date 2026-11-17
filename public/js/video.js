// Elementos <video> recebidos são reaproveitados entre redesenhos (para não piscar). Quando um deles
// sai da página — o compartilhamento parou, a câmera foi desligada — o navegador o pausa, e ao
// voltar ele não recomeça sozinho: ficaria congelado na última imagem mesmo com quadros novos
// chegando. Por isso, todo <video> recolocado na página passa por aqui depois de inserido.
export function retomarVideos(...videos) {
  for (const video of videos) {
    if (video?.paused) video.play().catch(() => {});
  }
}
