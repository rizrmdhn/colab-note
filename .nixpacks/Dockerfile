FROM ghcr.io/railwayapp/nixpacks:ubuntu-1733184274

ENTRYPOINT ["/bin/bash", "-l", "-c"]
WORKDIR /app/


COPY .nixpacks/nixpkgs-5624e1334b26ddc18da37e132b6fa8e93b481468.nix .nixpacks/nixpkgs-5624e1334b26ddc18da37e132b6fa8e93b481468.nix
RUN nix-env -if .nixpacks/nixpkgs-5624e1334b26ddc18da37e132b6fa8e93b481468.nix && nix-collect-garbage -d


ARG CI NIXPACKS_METADATA NODE_ENV NPM_CONFIG_PRODUCTION
ENV CI=$CI NIXPACKS_METADATA=$NIXPACKS_METADATA NODE_ENV=$NODE_ENV NPM_CONFIG_PRODUCTION=$NPM_CONFIG_PRODUCTION

# setup phase
# noop

# install phase
ENV NIXPACKS_PATH=/app/node_modules/.bin:$NIXPACKS_PATH
COPY . /app/.
RUN --mount=type=cache,id=NRzwY1F84-/root/bun,target=/root/.bun bun i --no-save

# build phase
COPY . /app/.
ENV SKIP_ENV_VALIDATION=1
RUN --mount=type=cache,id=NRzwY1F84-next/cache,target=/app/.next/cache --mount=type=cache,id=NRzwY1F84-node_modules/cache,target=/app/node_modules/.cache bun run build


RUN printf '\nPATH=/app/node_modules/.bin:$PATH' >> /root/.profile


# start
COPY . /app

CMD ["bun run start"]

