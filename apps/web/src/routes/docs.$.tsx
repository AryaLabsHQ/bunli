import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import type { ComponentType } from "react";
import browserCollections from "../../.source/browser";
import { docsLayoutOptions } from "../lib/layout";
import { mdxComponents } from "../lib/mdx";
import { source } from "../lib/source";

export const Route = createFileRoute("/docs/$")({
  component: DocsRouteComponent,
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const data = await loadDocsPage({ data: slugs });
    await docsClientLoader.preload(data.path);
    return data;
  },
});

const loadDocsPage = createServerFn({ method: "GET" })
  .inputValidator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) {
      throw notFound();
    }

    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

const docsClientLoader = browserCollections.docs.createClientLoader({
  component({ toc, frontmatter, default: MDX }) {
    return (
      <DocsPage toc={toc} full={Boolean(frontmatter.full)}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX components={mdxComponents} />
        </DocsBody>
      </DocsPage>
    );
  },
});

function DocsRouteComponent() {
  const data = Route.useLoaderData();
  const { pageTree } = useFumadocsLoader(data);
  const Content = docsClientLoader.getComponent(data.path) as unknown as ComponentType;

  return (
    <DocsLayout tree={pageTree} {...docsLayoutOptions()}>
      <Content />
    </DocsLayout>
  );
}
