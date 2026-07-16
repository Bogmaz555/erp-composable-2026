# Dev KMS auto-unseal stub (W121) — production uses cloud KMS (AWS/GCP/Azure)
seal "shamir" {
  secret_shares = 1
  secret_threshold = 1
}

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

ui = true
disable_mlock = true
