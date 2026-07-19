FROM debian:bookworm-slim AS builder

ARG CPUMINER_COMMIT=8da0556cec32819d967734527a8e0f1d8efb0671

RUN apt-get update \
 && apt-get install --no-install-recommends --yes \
      automake autotools-dev build-essential ca-certificates git libcurl4-openssl-dev libjansson-dev libssl-dev \
 && rm -rf /var/lib/apt/lists/*

RUN git clone --filter=blob:none https://github.com/pooler/cpuminer.git /src/cpuminer \
 && cd /src/cpuminer \
 && git checkout --detach "$CPUMINER_COMMIT" \
 && test "$(git rev-parse HEAD)" = "$CPUMINER_COMMIT" \
 && ./autogen.sh \
 && CFLAGS="-O3" ./configure --prefix=/usr/local \
 && make -j"$(nproc)" \
 && make install

FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install --no-install-recommends --yes ca-certificates gosu libcurl4 libjansson4 libssl3 \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --gid 1000 miner \
 && useradd --uid 1000 --gid miner --home-dir /data --no-create-home miner

COPY --from=builder /usr/local/bin/minerd /usr/local/bin/minerd
COPY --from=builder /src/cpuminer/COPYING /usr/share/licenses/cpuminer/COPYING
COPY infrastructure/lottery-miner/entrypoint.sh /usr/local/bin/nodi-miner-entrypoint
RUN chmod 0755 /usr/local/bin/nodi-miner-entrypoint

ENTRYPOINT ["nodi-miner-entrypoint"]
