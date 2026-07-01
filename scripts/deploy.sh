#!/bin/bash
# Deploy the current HEAD: wait for its CI image build, restart the homelab
# service, and verify the pod is running exactly this commit's image.
# Assumes HEAD is already pushed and a kubectl tunnel is up (see homelab README);
# skips digest verification if kubectl can't reach the cluster.
set -euo pipefail
cd "$(dirname "$0")/.."

SHA=$(git rev-parse HEAD)
if [ -n "$(git status --porcelain)" ]; then
  echo "warning: working tree is dirty; deploying pushed HEAD $SHA" >&2
fi

echo "waiting for CI on $SHA..."
until RUN=$(gh run list --commit "$SHA" --workflow=ci.yaml --limit 1 --json databaseId -q '.[0].databaseId') && [ -n "$RUN" ]; do
  sleep 3
done
gh run watch --exit-status "$RUN" >/dev/null
echo "image built"

gh workflow run restart.yaml -f service=adamcon --repo domdomegg/homelab
sleep 8
RESTART=$(gh run list --workflow=restart.yaml --repo domdomegg/homelab --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch --exit-status "$RESTART" --repo domdomegg/homelab >/dev/null
echo "service restarted"

KUBECTL="kubectl --server=https://127.0.0.1:16443 --tls-server-name=localhost --request-timeout=20s"
if $KUBECTL get ns >/dev/null 2>&1; then
  POD_DIGEST=$($KUBECTL get pod -l app=adamcon -o jsonpath='{.items[0].status.containerStatuses[0].imageID}' | sed 's/.*@//')
  TOKEN=$(curl -s 'https://ghcr.io/token?scope=repository:domdomegg/adamcon:pull' | jq -r .token)
  WANT=$(curl -s -o /dev/null -w '%{header_json}' "https://ghcr.io/v2/domdomegg/adamcon/manifests/$SHA" \
    -H "Authorization: Bearer $TOKEN" -H 'Accept: application/vnd.oci.image.index.v1+json' \
    | jq -r '.["docker-content-digest"][0]')
  if [ "$POD_DIGEST" = "$WANT" ]; then
    echo "verified: pod is running $SHA"
  else
    echo "MISMATCH: pod=$POD_DIGEST expected=$WANT" >&2
    exit 1
  fi
else
  echo "kubectl unreachable — skipped digest verification"
fi

curl -s --max-time 10 -o /dev/null -w 'https://adamcon.home.adamjones.me/ → %{http_code}\n' https://adamcon.home.adamjones.me/
