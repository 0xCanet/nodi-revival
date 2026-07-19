FROM debian:bookworm-slim AS downloader

ARG BITCOIN_VERSION=31.0
ARG TARGETARCH
ARG BITCOIN_SHA_AMD64=d3e4c58a35b1d0a97a457462c94f55501ad167c660c245cb1ffa565641c65074
ARG BITCOIN_SHA_ARM64=4de1d568dedd48604f75132421bc0abeca432639589b49a3909c81db3a813112

RUN apt-get update \
 && apt-get install --no-install-recommends --yes ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) archive_arch="x86_64-linux-gnu"; expected="$BITCOIN_SHA_AMD64" ;; \
      arm64) archive_arch="aarch64-linux-gnu"; expected="$BITCOIN_SHA_ARM64" ;; \
      *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    archive="bitcoin-${BITCOIN_VERSION}-${archive_arch}.tar.gz"; \
    curl --fail --location --proto '=https' --tlsv1.2 \
      "https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/${archive}" \
      --output "/tmp/${archive}"; \
    echo "${expected}  /tmp/${archive}" | sha256sum --check --strict; \
    tar --extract --gzip --file "/tmp/${archive}" --strip-components=2 \
      --directory /usr/local/bin \
      "bitcoin-${BITCOIN_VERSION}/bin/bitcoind" \
      "bitcoin-${BITCOIN_VERSION}/bin/bitcoin-cli"

FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install --no-install-recommends --yes ca-certificates gosu \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --gid 10001 bitcoin \
 && useradd --uid 10001 --gid bitcoin --home-dir /data --no-create-home bitcoin

COPY --from=downloader /usr/local/bin/bitcoind /usr/local/bin/bitcoind
COPY --from=downloader /usr/local/bin/bitcoin-cli /usr/local/bin/bitcoin-cli
COPY infrastructure/bitcoin/entrypoint.sh /usr/local/bin/nodi-bitcoin-entrypoint
RUN chmod 0755 /usr/local/bin/nodi-bitcoin-entrypoint

VOLUME ["/data"]
EXPOSE 8332 8333
ENTRYPOINT ["nodi-bitcoin-entrypoint"]
