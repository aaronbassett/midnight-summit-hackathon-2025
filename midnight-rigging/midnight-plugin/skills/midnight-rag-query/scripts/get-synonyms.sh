#!/usr/bin/env bash
#
# get-synonyms.sh - Retrieve blockchain terminology synonyms
#
# Usage:
#   echo "reentrancy" | ./get-synonyms.sh
#   ./get-synonyms.sh "smart contract"
#   ./get-synonyms.sh < input.txt
#
# Returns:
#   CSV list of synonyms to stdout
#   Exit code 0 if found, 1 if not found
#

set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNONYMS_FILE="${SCRIPT_DIR}/blockchain-synonyms.txt"

# Function to show usage
usage() {
    cat << EOF
Usage: $(basename "$0") [TERM]

Retrieve synonyms for blockchain terminology.

Arguments:
  TERM      The term to look up (optional if using stdin)

Examples:
  $(basename "$0") "reentrancy"
  echo "smart contract" | $(basename "$0")
  $(basename "$0") NFT

Output:
  CSV list of synonyms

Exit codes:
  0 - Term found
  1 - Term not found or error
EOF
}

# Check if synonyms file exists
if [[ ! -f "$SYNONYMS_FILE" ]]; then
    echo "Error: Synonyms file not found at: $SYNONYMS_FILE" >&2
    exit 1
fi

# Get input term from argument or stdin
TERM=""
if [[ $# -gt 0 ]]; then
    # Term provided as argument
    TERM="$1"

    # Show usage if help flag
    if [[ "$TERM" == "-h" ]] || [[ "$TERM" == "--help" ]]; then
        usage
        exit 0
    fi
elif [[ ! -t 0 ]]; then
    # Reading from stdin (pipe or redirect)
    read -r TERM
else
    echo "Error: No term provided" >&2
    usage >&2
    exit 1
fi

# Trim whitespace and convert to lowercase for case-insensitive matching
TERM=$(echo "$TERM" | xargs | tr '[:upper:]' '[:lower:]')

# Validate input
if [[ -z "$TERM" ]]; then
    echo "Error: Empty term provided" >&2
    exit 1
fi

# Search for the term (case-insensitive, match start of line)
result=$(grep -i -m 1 "^${TERM}:" "$SYNONYMS_FILE" 2>/dev/null || true)

if [[ -z "$result" ]]; then
    # Term not found - exit with error code
    exit 1
fi

# Extract synonyms (everything after the colon)
synonyms="${result#*:}"

# Output synonyms as CSV
echo "$synonyms"
exit 0
