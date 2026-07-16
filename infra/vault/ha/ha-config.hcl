# Vault HA dev stub (W129) — secondary node on :8201
storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8201"
  tls_disable = 1
}

ui = true
disable_mlock = true
api_addr = "http://127.0.0.1:8201"
cluster_addr = "http://127.0.0.1:8202"
