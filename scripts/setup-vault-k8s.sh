#!/bin/bash
set -e

echo "==========================================="
echo "🦅 MAX SPEED ERP: FAZA 26 - VAULT RAFT HA"
echo "==========================================="

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "[!] kubectl not found in PATH! Instalacja k3d/minikube jest wymagana."
    exit 1
fi

echo "1. Tworzenie namespace 'vault'..."
kubectl create namespace vault --dry-run=client -o yaml | kubectl apply -f -

echo "2. Aplikowanie manifestów Vault (ConfigMap, Service, StatefulSet)..."
kubectl apply -f infra/vault/k8s/configmap.yaml
kubectl apply -f infra/vault/k8s/service.yaml
kubectl apply -f infra/vault/k8s/statefulset.yaml

echo "3. Oczekiwanie na uruchomienie pierwszego węzła (vault-0)..."
kubectl wait --for=condition=Ready pod/vault-0 -n vault --timeout=120s || echo "[Info] Vault-0 requires initialization."

echo "4. Inicjalizacja Klastra Vault Raft na vault-0..."
# Inicjalizacja zwraca klucze w formacie JSON
if ! kubectl exec vault-0 -n vault -- vault status | grep -q "Initialized.*true"; then
    echo "Inicjalizowanie..."
    kubectl exec vault-0 -n vault -- vault operator init -key-shares=3 -key-threshold=2 -format=json > cluster-keys.json
    echo "[!] Zapisano cluster-keys.json w głównym katalogu. ZABEZPIECZ TEN PLIK."
else
    echo "[Info] Vault jest już zainicjalizowany."
fi

if [ -f "cluster-keys.json" ]; then
    UNSEAL_KEY_1=$(grep -oP '"unseal_keys_b64": \[\s*"\K[^"]+' cluster-keys.json | head -1)
    UNSEAL_KEY_2=$(grep -oP '"unseal_keys_b64": \[\s*"[^"]+",\s*"\K[^"]+' cluster-keys.json | head -1)
    ROOT_TOKEN=$(grep -oP '"root_token": "\K[^"]+' cluster-keys.json)

    echo "5. Unseal węzła vault-0..."
    kubectl exec vault-0 -n vault -- vault operator unseal "$UNSEAL_KEY_1"
    kubectl exec vault-0 -n vault -- vault operator unseal "$UNSEAL_KEY_2"

    echo "6. Dołączanie vault-1 i vault-2 do klastra Raft i unseal..."
    for i in 1 2; do
        kubectl exec vault-${i} -n vault -- vault operator raft join http://vault-0.vault-internal:8200 || true
        kubectl exec vault-${i} -n vault -- vault operator unseal "$UNSEAL_KEY_1"
        kubectl exec vault-${i} -n vault -- vault operator unseal "$UNSEAL_KEY_2"
    done

    echo "7. Włączanie autoryzacji Kubernetes Auth Method..."
    kubectl exec vault-0 -n vault -- sh -c "
        export VAULT_TOKEN=\"$ROOT_TOKEN\"
        vault auth enable kubernetes
        vault write auth/kubernetes/config \
            kubernetes_host=\"https://kubernetes.default.svc\"
    "

    echo "✅ KLASTER VAULT RAFT URUCHOMIONY I ZGOTOWANY DO BOJU!"
else
    echo "Brak pliku cluster-keys.json do wykonania unseal. Uruchom cluster-keys.json z poprzedniej inicjalizacji."
fi
