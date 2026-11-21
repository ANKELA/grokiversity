#!/usr/bin/env python3
"""Validate every unit YAML under courses/ against schema/unit.schema.json."""
import json, pathlib, sys, yaml, jsonschema
ROOT = pathlib.Path(__file__).resolve().parents[1]
schema = json.loads((ROOT / "schema/unit.schema.json").read_text())
bad = 0
for f in sorted(ROOT.glob("courses/*/units/*.yaml")):
    errs = list(jsonschema.Draft202012Validator(schema).iter_errors(yaml.safe_load(f.read_text())))
    print(("OK   " if not errs else "FAIL ") + str(f.relative_to(ROOT)))
    for e in errs: print("   ", list(e.path), e.message); bad += 1
sys.exit(1 if bad else 0)
