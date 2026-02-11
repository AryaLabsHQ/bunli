declare module "fumadocs-mdx/runtime/vite" {
  interface RuntimeCollectionFactory {
    doc(...args: unknown[]): unknown;
    meta(...args: unknown[]): unknown;
  }

  export function fromConfig<TConfig>(): RuntimeCollectionFactory;
}
