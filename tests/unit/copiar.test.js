import { test } from "node:test";
import assert from "node:assert/strict";
import { copiarAoCriar, copiarLink } from "../../public/js/copiar.js";

const LINK = "http://localhost:3000/sala/abc";

class ClipboardItemFalso {
  constructor(itens) {
    this.itens = itens;
  }
}

test("copiarAoCriar com write bem-sucedido devolve true e copia o link", async () => {
  let escrito;
  const clipboard = {
    async write([item]) {
      const blob = await item.itens["text/plain"];
      escrito = await blob.text();
    },
  };
  const resultado = await copiarAoCriar(Promise.resolve(LINK), {
    clipboard,
    ClipboardItemCls: ClipboardItemFalso,
  });
  assert.equal(resultado, true);
  assert.equal(escrito, LINK);
});

test("copiarAoCriar devolve false quando write é bloqueado", async () => {
  const clipboard = { write: () => Promise.reject(new Error("NotAllowedError")) };
  const resultado = await copiarAoCriar(Promise.resolve(LINK), {
    clipboard,
    ClipboardItemCls: ClipboardItemFalso,
  });
  assert.equal(resultado, false);
});

test("copiarAoCriar sem ClipboardItem usa writeText", async () => {
  let escrito;
  const clipboard = {
    async writeText(texto) {
      escrito = texto;
    },
  };
  const resultado = await copiarAoCriar(Promise.resolve(LINK), {
    clipboard,
    ClipboardItemCls: undefined,
  });
  assert.equal(resultado, true);
  assert.equal(escrito, LINK);
});

test("copiarAoCriar devolve false quando writeText é bloqueado", async () => {
  const clipboard = { writeText: () => Promise.reject(new Error("NotAllowedError")) };
  const resultado = await copiarAoCriar(Promise.resolve(LINK), {
    clipboard,
    ClipboardItemCls: undefined,
  });
  assert.equal(resultado, false);
});

test("copiarAoCriar devolve false sem área de transferência", async () => {
  const resultado = await copiarAoCriar(Promise.resolve(LINK), {
    clipboard: undefined,
    ClipboardItemCls: undefined,
  });
  assert.equal(resultado, false);
});

test("copiarAoCriar devolve false quando o link não chega", async () => {
  const promessaLink = Promise.reject(new Error("rede"));
  promessaLink.catch(() => {});
  const resultado = await copiarAoCriar(promessaLink, {
    clipboard: { writeText: async () => {} },
    ClipboardItemCls: undefined,
  });
  assert.equal(resultado, false);
});

test("copiarLink com writeText bem-sucedido devolve true e copia o link", async () => {
  let escrito;
  const clipboard = {
    async writeText(texto) {
      escrito = texto;
    },
  };
  assert.equal(await copiarLink(LINK, { clipboard }), true);
  assert.equal(escrito, LINK);
});

test("copiarLink devolve false quando writeText é bloqueado", async () => {
  const clipboard = { writeText: () => Promise.reject(new Error("NotAllowedError")) };
  assert.equal(await copiarLink(LINK, { clipboard }), false);
});

test("copiarLink devolve false sem área de transferência", async () => {
  assert.equal(await copiarLink(LINK, { clipboard: undefined }), false);
});
