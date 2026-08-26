import type { QueryloomResource } from "./runtime.js";

function resourceUrl(resource: QueryloomResource, baseUrl: URL): URL {
  if (resource.url) return new URL(resource.url);
  if (resource.path) return new URL(resource.path, baseUrl);
  throw new Error(`Resource ${resource.name} needs a path or url`);
}

function reportResource(event: Record<string, unknown>): void {
  const environment = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
  if (environment?.DEV) console.debug("[queryloom] resource", event);
}

export async function fetchResources(resources: QueryloomResource[], baseUrl: URL) {
  return Promise.all(
    resources.map(async (resource) => {
      const url = resourceUrl(resource, baseUrl);
      const startedAt = performance.now();
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
        const data = new Uint8Array(await response.arrayBuffer());
        reportResource({
          resource: resource.name,
          phase: "fetch",
          bytes: data.byteLength,
          durationMs: performance.now() - startedAt,
        });
        return { resource, data };
      } catch (cause) {
        const kind = cause instanceof Error && cause.message.startsWith("HTTP ") ? "http" : "network";
        reportResource({
          resource: resource.name,
          phase: "fetch",
          kind,
          durationMs: performance.now() - startedAt,
          cause,
        });
        throw new Error(`Could not fetch resource ${resource.name} from ${url} (${kind})`, { cause });
      }
    }),
  );
}
