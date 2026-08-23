import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { build as viteBuild, createServer, preview as vitePreview, type InlineConfig, type Plugin } from "vite";
import type { QueryloomConfig } from "./config.js";

const virtualEntryId = "\0queryloom/generated-entry";
const virtualEntryUrl = "/@queryloom/generated-entry.js";
const virtualStylesId = "\0queryloom/tailwind.css";
const virtualStylesUrl = "/@queryloom/tailwind.css";

function generatedEntry(project: { dashboardPath: string; config: QueryloomConfig }): string {
  return `import ${JSON.stringify(virtualStylesUrl)};
import { configure } from "@queryloom/library";
import Dashboard from ${JSON.stringify(pathToFileURL(project.dashboardPath).href)};
import { mount } from "svelte";

configure(${JSON.stringify(project.config)});
mount(Dashboard, { target: document.getElementById("app") });
`;
}

function generatedStyles(project: { dashboardPath: string }): string {
  return `@import "tailwindcss";
@source ${JSON.stringify(project.dashboardPath)};

@layer base {
  html { min-width: 320px; }
  body {
    margin: 0;
    min-width: 320px;
    background: var(--color-slate-50);
    color: var(--color-slate-900);
    font-family: var(--font-sans);
  }

  .lc-root-container {
    --color-primary: #0777b3;
    --color-surface-100: #ffffff;
    --color-surface-200: #f8f8f8;
    --color-surface-300: #e1e1e1;
    --color-surface-content: #231f20;
  }
}
`;
}

function documentHtml(entryFileName: string, stylesheetFileName?: string): string {
  const stylesheet = stylesheetFileName ? `<link rel="stylesheet" href="./${stylesheetFileName}">` : "";
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">${stylesheet}<title>Queryloom Dashboard</title></head>
  <body><div id="app"></div><script type="module" src="./${entryFileName}"></script></body>
</html>`;
}

function svelteClientImport(source: string): string | undefined {
  const svelteRoot = fileURLToPath(new URL("../node_modules/svelte/src/", import.meta.url));
  if (source === "svelte") return path.join(svelteRoot, "index-client.js");
  if (source === "svelte/easing") return path.join(svelteRoot, "easing/index.js");
  if (source === "svelte/events") return path.join(svelteRoot, "events/index.js");
  if (source === "svelte/motion") return path.join(svelteRoot, "motion/index.js");
  if (source === "svelte/reactivity") return path.join(svelteRoot, "reactivity/index-client.js");
  if (source === "svelte/store") return path.join(svelteRoot, "store/index-client.js");
  if (source === "svelte/transition") return path.join(svelteRoot, "transition/index.js");
  if (source === "svelte/internal/client") return path.join(svelteRoot, "internal/client/index.js");
  if (source === "svelte/internal/disclose-version") return path.join(svelteRoot, "internal/disclose-version.js");
  if (source.startsWith("svelte/internal/")) return path.join(svelteRoot, `${source.slice("svelte/".length)}.js`);
  return undefined;
}

function queryloomPlugin(project: { projectDir: string; dashboardPath: string; config: QueryloomConfig }): Plugin {
  return {
    name: "queryloom-project",
    resolveId(source) {
      if (source === virtualEntryUrl || source === virtualEntryId) return virtualEntryId;
      if (source === virtualStylesUrl || source === virtualStylesId) return virtualStylesId;
      const svelteImport = svelteClientImport(source);
      if (svelteImport) return svelteImport;
      return undefined;
    },
    load(id) {
      if (id === virtualEntryId) return generatedEntry(project);
      if (id === virtualStylesId) return generatedStyles(project);
      return undefined;
    },
    handleHotUpdate({ file, modules, server }) {
      if (path.resolve(file) !== path.resolve(project.dashboardPath)) return modules;

      const styles = server.moduleGraph.getModuleById(virtualStylesId);
      if (!styles) return modules;

      server.moduleGraph.invalidateModule(styles);
      return [...modules, styles];
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url === "/" || request.url?.startsWith("/?")) {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html");
          response.end(documentHtml(virtualEntryUrl.slice(1)));
          return;
        }
        next();
      });
    },
    async generateBundle(_, bundle) {
      for (const resource of project.config.resources) {
        const source = await readFile(path.join(project.projectDir, resource.path));
        this.emitFile({ type: "asset", fileName: resource.path, source });
      }

      const stylesheet = Object.values(bundle).find(
        (output) => output.type === "asset" && output.fileName.endsWith(".css"),
      );
      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source: documentHtml("assets/dashboard.js", stylesheet?.type === "asset" ? stylesheet.fileName : undefined),
      });
    },
  };
}

function libraryAlias(): string {
  const sourcePath = fileURLToPath(new URL("../../runtime/src/index.ts", import.meta.url));
  return existsSync(sourcePath) ? sourcePath : fileURLToPath(import.meta.resolve("@queryloom/library"));
}

function layerchartAlias(): string {
  return fileURLToPath(import.meta.resolve("layerchart"));
}

function tailwindAlias(): string {
  return fileURLToPath(import.meta.resolve("tailwindcss/index.css"));
}

export function viteConfig(project: { projectDir: string; dashboardPath: string; config: QueryloomConfig }, command: "serve" | "build", options: { outDir?: string } = {}): InlineConfig {
  return {
    configFile: false,
    root: project.projectDir,
    base: "./",
    plugins: [tailwindcss(), svelte({ compilerOptions: { dev: command === "serve" } }), queryloomPlugin(project)],
    resolve: {
      alias: { "@queryloom/library": libraryAlias(), layerchart: layerchartAlias(), tailwindcss: tailwindAlias() },
      dedupe: ["svelte"],
    },
    optimizeDeps: {
      exclude: ["layerchart"],
    },
    server: {
      fs: { allow: [project.projectDir, path.dirname(fileURLToPath(new URL("../../runtime", import.meta.url)))] },
    },
    build: {
      outDir: options.outDir ?? path.join(project.projectDir, "dist"),
      emptyOutDir: true,
      rollupOptions: {
        input: virtualEntryUrl,
        output: { entryFileNames: "assets/dashboard.js" },
      },
    },
    appType: "spa",
  };
}

export async function buildProject(project: { projectDir: string; dashboardPath: string; config: QueryloomConfig }, outDir?: string): Promise<void> {
  await viteBuild(viteConfig(project, "build", { outDir }));
}

export async function startDev(project: { projectDir: string; dashboardPath: string; config: QueryloomConfig }, options: { host?: string; port?: number; strictPort?: boolean }): Promise<void> {
  const server = await createServer({
    ...viteConfig(project, "serve"),
    server: { ...viteConfig(project, "serve").server, host: options.host, port: options.port, strictPort: options.strictPort },
  });
  await server.listen();
  server.printUrls();
}

export async function startPreview(projectDir: string, options: { host?: string; port?: number }): Promise<void> {
  const server = await vitePreview({ root: projectDir, preview: { host: options.host, port: options.port } });
  server.printUrls();
}
