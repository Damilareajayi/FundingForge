#!/usr/bin/env python3
"""
Test script to debug the agent directly without Node.js
"""
import sys

# Test CV text
test_cv = """
Dr. John Smith
Professor of Computer Science
PhD in Machine Learning, Stanford University

Research Interests:
- Artificial Intelligence
- Deep Learning
- Natural Language Processing
- Computer Vision

Publications: 50+ peer-reviewed papers
Grants: $2M in NSF funding
"""

print("Testing agent import...", file=sys.stderr)
try:
    from agents import run_agent
    print("✓ Import successful", file=sys.stderr)
except Exception as e:
    print(f"✗ Import failed: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nTesting agent execution...", file=sys.stderr)
try:
    result = run_agent(test_cv)
    print("✓ Agent execution successful", file=sys.stderr)
    print("\nResult:", file=sys.stderr)
    import json
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"✗ Agent execution failed: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
