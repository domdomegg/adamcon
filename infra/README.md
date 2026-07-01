# AdamCon AWS setup (one-off, not IaC)

Records the manual AWS configuration for the app's email sending, done
2026-07-02 with admin credentials via `aws login`. The Kubernetes side
(OIDC discovery server) *is* IaC — see `homelab/src/k8s/oidcDiscovery.ts`.

## How it works (workload identity federation)

No long-lived AWS keys anywhere. The k3s cluster issues service account
tokens with a public issuer; AWS IAM validates them against the cluster's
published JWKS and lets the `adamcon` pod assume a role scoped to
SES-send on the `adamjones.me` identity.

- k3s issues tokens with `iss=https://k8s-oidc.home.adamjones.me`
  (set in `/etc/rancher/k3s/config.yaml` `kube-apiserver-arg`; backup of the
  prior config at `config.yaml.pre-oidc` on the XPS)
- Discovery + JWKS served statically by the `oidc-discovery` deployment
  (public keys only; regenerate after key rotation with
  `kubectl get --raw /openid/v1/jwks`)
- SES: `adamjones.me` was already a verified identity in eu-west-1 and the
  account already has production access — nothing needed there

## Commands run

```sh
aws iam create-open-id-connect-provider \
  --url https://k8s-oidc.home.adamjones.me \
  --client-id-list sts.amazonaws.com

aws iam create-role --role-name adamcon \
  --assume-role-policy-document file://adamcon-trust.json \
  --description "AdamCon app: SES send via k8s workload identity federation"

aws iam put-role-policy --role-name adamcon \
  --policy-name adamcon-ses-send \
  --policy-document file://adamcon-ses-policy.json
```

Role: `arn:aws:iam::338337944728:role/adamcon`, trusts only
`system:serviceaccount:default:adamcon` with audience `sts.amazonaws.com`
(see `adamcon-trust.json`), allowed only `ses:SendEmail`/`ses:SendRawEmail`
on the `adamjones.me` identity (see `adamcon-ses-policy.json`).

## What the app deployment needs

ServiceAccount `adamcon` (namespace `default`), a projected token volume
with audience `sts.amazonaws.com`, and env:

```
AWS_ROLE_ARN=arn:aws:iam::338337944728:role/adamcon
AWS_WEB_IDENTITY_TOKEN_FILE=/var/run/secrets/aws/token
AWS_REGION=eu-west-1
EMAIL_FROM=AdamCon <adamcon@adamjones.me>
APP_ORIGIN=https://adamcon.adamjones.me
```

The AWS SDK default credential chain picks these up automatically — no app
code changes. Verified end-to-end 2026-07-02: a test pod assumed the role
and delivered a real email via SES.
