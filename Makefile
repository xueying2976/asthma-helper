PROJECT := AeriDay.xcodeproj
SCHEME := AeriDay
# Overridable: `make demo DERIVED_DATA=/tmp/AeriDayDD-clean` builds AND launches that same bundle.
DERIVED_DATA ?= /tmp/AeriDayDerivedData

.PHONY: doctor generate build run test checks verify clean-generated pure-report-tests wire-contract

pure-report-tests:
	./scripts/run_pure_report_tests.sh
	./scripts/typecheck_report_service.sh

wire-contract:
	./scripts/run_wire_contract_check.sh

doctor:
	./scripts/check_toolchain.sh

generate:
	xcodegen generate --spec project.yml

build: generate
	@destination="$${AERIDAY_DESTINATION:-$$(./scripts/default_destination.sh)}"; \
	echo "Using destination: $$destination"; \
	xcodebuild -project "$(PROJECT)" -scheme "$(SCHEME)" -configuration Debug -destination "$$destination" -derivedDataPath "$(DERIVED_DATA)" build

test: generate
	@destination="$${AERIDAY_DESTINATION:-$$(./scripts/default_destination.sh)}"; \
	echo "Using destination: $$destination"; \
	xcodebuild -project "$(PROJECT)" -scheme "$(SCHEME)" -configuration Debug -destination "$$destination" -derivedDataPath "$(DERIVED_DATA)" test

run: build
	AERIDAY_DERIVED_DATA="$(DERIVED_DATA)" ./scripts/run_simulator.sh

demo: build
	AERIDAY_DERIVED_DATA="$(DERIVED_DATA)" AERIDAY_DEMO=1 ./scripts/run_simulator.sh

checks:
	./scripts/check_doc_pairs.sh
	./scripts/check_localizations.sh
	./scripts/check_boundaries.sh
	./scripts/check_generated_files.sh

verify: doctor build test checks

clean-generated:
	@echo "Generated Xcode project and Derived Data are intentionally git-ignored."
