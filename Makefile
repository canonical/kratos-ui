GO111MODULE?=on
CGO_ENABLED?=0
GOOS?=linux
GO_BIN?=app
GO?=go
GOFLAGS?=-ldflags=-w -ldflags=-s -a -buildvcs
UI_FOLDER?=

.EXPORT_ALL_VARIABLES:

mocks: vendor
	$(GO) install go.uber.org/mock/mockgen@v0.3.0
	# generate gomocks
	$(GO) generate ./...
.PHONY: mocks

test: mocks vet
	$(GO) test ./... -cover -coverprofile coverage_source.out
	# this will be cached, just needed to the test.json
	$(GO) test ./... -cover -coverprofile coverage_source.out -json > test_source.json
	cat coverage_source.out | grep -v "mock_*" | tee coverage.out
	cat test_source.json | grep -v "mock_*" | tee test.json
.PHONY: test

vet: cmd/ui/dist
	$(GO) vet ./...
.PHONY: vet

vendor:
	$(GO) mod vendor
.PHONY: vendor

build: cmd/ui/dist
	$(GO) build -o $(GO_BIN) ./
.PHONY: build

# plan is to use this as a probe, if folder is there target wont run and npm-build will skip
# but not working atm
cmd/ui/dist:
	@echo "copy dist npm files into cmd/ui folder"
	mkdir -p cmd/ui/dist
	cp -r $(UI_FOLDER)ui/dist cmd/ui/
.PHONY: cmd/ui/dist

npm-build:
	$(MAKE) -C ui/ build
.PHONY: npm-build

update-openfga-model:
	@printf 'package authorization\n\n// Code generated by Makefile; DO NOT EDIT.\n\nvar AuthModel = `%s`\n' '$(shell fga model transform --file=./internal/authorization/schema.openfga | jq -c)' > ./internal/authorization/auth_model.go
.PHONY: update-openfga-model
