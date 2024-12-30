FROM ghcr.io/railwayapp/nixpacks:ubuntu-1733184274
ENTRYPOINT ["/bin/bash", "-l", "-c"]
WORKDIR /app/
COPY .nixpacks/nixpkgs-5624e1334b26ddc18da37e132b6fa8e93b481468.nix .nixpacks/nixpkgs-5624e1334b26ddc18da37e132b6fa8e93b481468.nix
RUN nix-env -if .nixpacks/nixpkgs-5624e1334b26ddc18da37e132b6fa8e93b481468.nix && nix-collect-garbage -d

# Add your NEXT_PUBLIC arg here with the other args
ARG CI NIXPACKS_METADATA NODE_ENV NPM_CONFIG_PRODUCTION NEXT_PUBLIC_HOCUSPOCUS

# Include it in the ENV section
ENV CI=$CI NIXPACKS_METADATA=$NIXPACKS_METADATA NODE_ENV=$NODE_ENV NPM_CONFIG_PRODUCTION=$NPM_CONFIG_PRODUCTION NEXT_PUBLIC_HOCUSPOCUS=$NEXT_PUBLIC_HOCUSPOCUS

# Rest of your Dockerfile remains the same
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