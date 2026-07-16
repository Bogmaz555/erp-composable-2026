#!/bin/bash
set -e

echo "🦅 Instalacja K3d i tworzenie lokalnego klastra Kubernetes dla Fazy 26..."

# Sprawdzanie czy k3d jest zainstalowane
if ! command -v k3d &> /dev/null; then
    echo "Pobieranie i instalowanie k3d..."
    curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
else
    echo "k3d jest już zainstalowane."
fi

# Tworzenie klastra z 1 serwerem i 3 agentami (symulacja potężnego środowiska)
echo "Tworzenie klastra 'erp-twierdza'..."
k3d cluster create erp-twierdza \
  --servers 1 \
  --agents 3 \
  -p "80:80@loadbalancer" \
  -p "443:443@loadbalancer" \
  --k3s-arg "--disable=traefik@server:0"

echo "✅ Klaster gotowy! Aby sprawdzić status węzłów, uruchom:"
echo "kubectl get nodes"
