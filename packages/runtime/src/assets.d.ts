declare module "*?url" {
  const url: string;
  export default url;
}

declare module "*.svelte" {
  const component: any;
  export default component;
}
