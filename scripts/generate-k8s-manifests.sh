#!/bin/bash
set -e

OUT_DIR="infra/apps/k8s"
mkdir -p "$OUT_DIR"

APPS=(
  "api-gateway|3000"
  "analytics-service|3012"
  "crm-service|3001"
  "eam-service|3008"
  "finance|3006"
  "hr|3011"
  "inv-service|3004"
  "mes-service|3003"
  "plm-service|3009"
  "pm-service|3002"
  "proc-service|3005"
  "quality-service|3007"
  "tax-legal|3010"
)

# Namespace
cat <<EOF > "$OUT_DIR/namespace.yaml"
apiVersion: v1
kind: Namespace
metadata:
  name: erp-apps
EOF

for entry in "${APPS[@]}"; do
  IFS="|" read -r APP_NAME APP_PORT <<< "$entry"

  cat <<EOF > "$OUT_DIR/${APP_NAME}.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $APP_NAME
  namespace: erp-apps
  labels:
    app: $APP_NAME
spec:
  replicas: 1
  selector:
    matchLabels:
      app: $APP_NAME
  template:
    metadata:
      labels:
        app: $APP_NAME
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "erp-apps"
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/erp/$APP_NAME"
        vault.hashicorp.com/agent-inject-template-config: |
          {{- with secret "secret/data/erp/$APP_NAME" -}}
          {{ range \$k, \$v := .Data.data }}
          export {{ \$k }}="{{ \$v }}"
          {{ end }}
          {{- end -}}
    spec:
      serviceAccountName: erp-apps-sa
      containers:
      - name: $APP_NAME
        image: $APP_NAME:latest
        imagePullPolicy: Never
        ports:
        - containerPort: $APP_PORT
        env:
        - name: PORT
          value: "$APP_PORT"
        command: ["/bin/sh", "-c"]
        args:
        - |
          source /vault/secrets/config || true
          npm run start
        livenessProbe:
          httpGet:
            path: /health
            port: $APP_PORT
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: $APP_PORT
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: $APP_NAME
  namespace: erp-apps
spec:
  selector:
    app: $APP_NAME
  ports:
  - protocol: TCP
    port: 80
    targetPort: $APP_PORT
EOF
done

# ServiceAccount and RBAC for Vault
cat <<EOF > "$OUT_DIR/vault-auth.yaml"
apiVersion: v1
kind: ServiceAccount
metadata:
  name: erp-apps-sa
  namespace: erp-apps
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: role-tokenreview-binding
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:auth-delegator
subjects:
  - kind: ServiceAccount
    name: erp-apps-sa
    namespace: erp-apps
EOF

# Ingress for Gateway
cat <<EOF > "$OUT_DIR/ingress.yaml"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: erp-ingress
  namespace: erp-apps
  annotations:
    ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - host: api.erp.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
EOF

echo "Wygenerowano manifesty w $OUT_DIR"
