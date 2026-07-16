{{- define "erp.name" -}}
erp
{{- end -}}

{{- define "erp.labels" -}}
app.kubernetes.io/managed-by: erp-helm
app.kubernetes.io/version: "2026"
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}
