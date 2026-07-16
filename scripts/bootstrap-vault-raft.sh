#!/bin/bash
set -e

echo "Oczekiwanie na uruchomienie vault-0 (STATUS: Running)..."
while ! kubectl get pod vault-0 -n vault | grep -q "Running"; do
    sleep 2
done
echo "vault-0 działa."

if ! kubectl exec vault-0 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault status" | grep -q "Initialized.*true"; then
    echo "Inicjalizacja vault-0..."
    kubectl exec vault-0 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator init -key-shares=3 -key-threshold=2 -format=json" > cluster-keys.json
else
    echo "Vault jest już zainicjalizowany."
fi

UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' cluster-keys.json)
UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' cluster-keys.json)
ROOT_TOKEN=$(jq -r '.root_token' cluster-keys.json)

echo "Unsealing vault-0..."
kubectl exec vault-0 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal $UNSEAL_KEY_1"
kubectl exec vault-0 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal $UNSEAL_KEY_2"

echo "vault-0 odpieczętowany."

echo "Oczekiwanie na uruchomienie vault-1..."
while ! kubectl get pod vault-1 -n vault 2>/dev/null | grep -q "Running"; do
    sleep 2
done
echo "Dołączanie vault-1 do Raft..."
kubectl exec vault-1 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator raft join http://vault-0.vault-internal:8200"
kubectl exec vault-1 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal $UNSEAL_KEY_1"
kubectl exec vault-1 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal $UNSEAL_KEY_2"

echo "vault-1 odpieczętowany."

echo "Oczekiwanie na uruchomienie vault-2..."
while ! kubectl get pod vault-2 -n vault 2>/dev/null | grep -q "Running"; do
    sleep 2
done
echo "Dołączanie vault-2 do Raft..."
kubectl exec vault-2 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator raft join http://vault-0.vault-internal:8200"
kubectl exec vault-2 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal $UNSEAL_KEY_1"
kubectl exec vault-2 -n vault -- sh -c "VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal $UNSEAL_KEY_2"

echo "vault-2 odpieczętowany."

echo "Oczekiwanie aż cały klaster Vault będzie Ready..."
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=vault -n vault --timeout=60s

echo "Konfiguracja Kubernetes Auth na vault-0..."
kubectl exec vault-0 -n vault -- sh -c "
    export VAULT_ADDR=\"http://127.0.0.1:8200\"
    export VAULT_TOKEN=\"$ROOT_TOKEN\"
    vault auth enable kubernetes || true
    vault write auth/kubernetes/config kubernetes_host=\"https://kubernetes.default.svc\"
"

echo "KLASTER VAULT RAFT HA ZOSTAŁ POPRAWNIE ZAINICJALIZOWANY I JEST W STANIE READY!"
