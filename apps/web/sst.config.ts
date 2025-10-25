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
          apiToken: process.env.CLOUDFLARE_API_TOKEN,
        },
        aws: {
          profile: "aryalabs",
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
