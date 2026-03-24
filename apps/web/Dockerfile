FROM --platform=linux/amd64 docker.io/cloudflare/sandbox:0.7.1

ARG BUN_VERSION=1.3.11
ARG BUNLI_VERSION=0.8.2

ENV BUN_INSTALL=/root/.bun
ENV PATH="${BUN_INSTALL}/bin:${PATH}"
ENV BUNLI_WORKSPACE=/workspace/demo
ENV WORKBENCH_SANDBOX_NETWORK=off

RUN curl -fsSL https://bun.sh/install | bash -s -- bun-v${BUN_VERSION}
RUN bun add --global "bunli@${BUNLI_VERSION}"

WORKDIR /workspace
RUN mkdir -p ${BUNLI_WORKSPACE}/src ${BUNLI_WORKSPACE}/.bunli
COPY workbench-template/package.json /workspace/package.json
COPY workbench-template/src/index.ts ${BUNLI_WORKSPACE}/src/index.ts
RUN bun add "@bunli/core@${BUNLI_VERSION}" "zod@^4.3.6"

# PTY bridge server runs on this port.
EXPOSE 8082
