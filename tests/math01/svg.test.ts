import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { boxFaces } from "../../apps/web/src/math/geometry.mjs";

test("M01 A07 two real SolidView instances have unique SVG definitions and local references without inline style or raw SVG", async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const { default: SolidView } = await vite.ssrLoadModule(
      "/apps/web/src/math/SolidView.tsx",
    );
    const props = {
      solid: boxFaces(2.4, 1.5, 1.2),
      azimuth: 35,
      elevation: 25,
      title: "Synthetic geometry",
    };
    const html = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(SolidView, props),
        createElement(SolidView, props),
      ),
    );
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const refs = [...html.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    assert(ids.length > 8 && refs.length > 8);
    assert.equal(new Set(ids).size, ids.length);
    assert(refs.every((id) => ids.includes(id)));
    assert(!/style=|<script|foreignObject|data:|<iframe|<image/.test(html));
  } finally {
    await vite.close();
  }
});
