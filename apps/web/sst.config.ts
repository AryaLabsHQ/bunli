/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "bunli",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        cloudflare: {
          version: "6.2.0",
          apiToken: process.env.CLOUDFLARE_API_TOKEN,
        },
        aws: {
          region: "us-west-2",
        }
      },
    };
  },
  async run() {
    new sst.aws.Nextjs("BunliWeb", {
      domain: {
        name: "bunli.dev",
        aliases: ["www.bunli.dev"],
        dns: sst.cloudflare.dns(),
      }
    });
  },
});
