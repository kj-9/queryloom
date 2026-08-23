declare module "*?url" {
  const url: string;
  export default url;
}

declare module "*.svelte" {
  const component: import("svelte").Component;
  export default component;
}
