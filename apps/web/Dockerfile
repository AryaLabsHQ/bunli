FROM --platform=linux/amd64 docker.io/cloudflare/sandbox:0.7.1

ARG BUN_VERSION=1.3.9
ARG BUNLI_VERSION=0.5.3

ENV BUN_INSTALL=/root/.bun
ENV PATH="${BUN_INSTALL}/bin:${PATH}"
ENV BUNLI_WORKSPACE=/workspace/demo
ENV WORKBENCH_SANDBOX_NETWORK=off

RUN curl -fsSL https://bun.sh/install | bash -s -- bun-v${BUN_VERSION}
RUN bun add --global "bunli@${BUNLI_VERSION}"

WORKDIR /workspace/demo
RUN mkdir -p /workspace/demo/src /workspace/demo/.bunli
RUN printf 'const timestamp = new Date().toISOString();\nconsole.log("Hello from bunli sandbox workbench");\nconsole.log("Timestamp:", timestamp);\n' > /workspace/demo/src/index.ts

# PTY bridge server runs on this port.
EXPOSE 8082
