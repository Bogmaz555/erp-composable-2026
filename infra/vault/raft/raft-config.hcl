# Vault Raft cluster config (W133) — dev single-node Raft
storage "raft" {
  path    = "/vault/data"
  node_id = "raft_node_1"
}

listener "tcp" {
  address     = "0.0.0.0:8202"
  tls_disable = 1
}

ui = true
disable_mlock = true
api_addr     = "http://127.0.0.1:8202"
cluster_addr = "http://127.0.0.1:8203"
