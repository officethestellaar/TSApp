#!/usr/bin/env bash
# Wrapper to generate the Development Services Agreement Word document.
# Usage: ./generate_contract.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Generating Development Services Agreement..."
python3 "$SCRIPT_DIR/generate_contract.py"
echo "Done. Output: $SCRIPT_DIR/DEVELOPMENT_SERVICES_AGREEMENT.docx"
