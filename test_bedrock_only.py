#!/usr/bin/env python3
"""
Test Bedrock model directly without Knowledge Bases
"""
import sys
import boto3
from strands import Agent
from strands.models.bedrock import BedrockModel

print("Testing Bedrock model with strands...", file=sys.stderr)

try:
    # Create session
    session = boto3.Session(region_name="us-east-1")
    
    # Create model
    model = BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        boto_session=session,
    )
    
    # Create simple agent without tools
    agent = Agent(
        model=model,
        system_prompt="You are a helpful assistant. Respond in JSON format.",
    )
    
    # Test simple query
    response = agent("Say hello in JSON format with a 'message' field")
    print(f"✓ Agent response: {response}", file=sys.stderr)
    print("SUCCESS: Bedrock model works with strands!")
    
except Exception as e:
    print(f"✗ Failed: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
