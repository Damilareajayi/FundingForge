#!/usr/bin/env python3
"""
Test AWS Bedrock connection and Knowledge Base access
"""
import os
import sys
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

load_dotenv()

def test_credentials():
    """Test if AWS credentials are loaded"""
    print("=" * 60)
    print("AWS CREDENTIALS CHECK")
    print("=" * 60)
    
    required_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION']
    all_present = True
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            if 'KEY' in var or 'TOKEN' in var:
                display = value[:10] + '...' + value[-4:] if len(value) > 14 else value[:10] + '...'
            else:
                display = value
            print(f"✓ {var}: {display}")
        else:
            print(f"✗ {var}: NOT SET")
            all_present = False
    
    session_token = os.getenv('AWS_SESSION_TOKEN')
    if session_token:
        print(f"✓ AWS_SESSION_TOKEN: Set ({len(session_token)} chars)")
    else:
        print("⚠ AWS_SESSION_TOKEN: Not set (may be required for temporary credentials)")
    
    print()
    return all_present

def test_bedrock_connection():
    """Test connection to AWS Bedrock"""
    print("=" * 60)
    print("BEDROCK CONNECTION TEST")
    print("=" * 60)
    
    try:
        session = boto3.Session(region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'))
        client = session.client('bedrock-agent-runtime')
        print("✓ Bedrock client created successfully")
        print(f"  Region: {client.meta.region_name}")
        return client
    except NoCredentialsError:
        print("✗ No AWS credentials found")
        return None
    except Exception as e:
        print(f"✗ Failed to create Bedrock client: {e}")
        return None

def test_knowledge_base_query(client):
    """Test querying the Knowledge Base"""
    print("\n" + "=" * 60)
    print("KNOWLEDGE BASE QUERY TEST")
    print("=" * 60)
    
    if not client:
        print("✗ Skipping (no client available)")
        return False
    
    kb_id = "BQJIUNN7T7"  # From agents.py
    test_query = "machine learning research grants"
    
    try:
        print(f"Querying KB {kb_id} with: '{test_query}'")
        response = client.retrieve(
            knowledgeBaseId=kb_id,
            retrievalQuery={"text": test_query},
            retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 2}},
        )
        
        results = response.get('retrievalResults', [])
        print(f"✓ Query successful! Retrieved {len(results)} results")
        
        if results:
            print("\nFirst result preview:")
            first_result = results[0]
            content = first_result.get('content', {}).get('text', '')
            print(f"  {content[:200]}..." if len(content) > 200 else f"  {content}")
        
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg = e.response.get('Error', {}).get('Message', str(e))
        print(f"✗ AWS Error ({error_code}): {error_msg}")
        
        if error_code == 'ExpiredTokenException':
            print("\n⚠ Your AWS session token has EXPIRED!")
            print("  Please generate new temporary credentials and update .env")
        elif error_code == 'AccessDeniedException':
            print("\n⚠ Access denied to Knowledge Base")
            print("  Check IAM permissions for bedrock:Retrieve")
        
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def main():
    print("\n🔍 FundingForge AWS Connection Diagnostics\n")
    
    # Test 1: Credentials
    creds_ok = test_credentials()
    if not creds_ok:
        print("\n❌ FAILED: Missing required AWS credentials")
        return 1
    
    # Test 2: Bedrock connection
    client = test_bedrock_connection()
    if not client:
        print("\n❌ FAILED: Could not connect to AWS Bedrock")
        return 1
    
    # Test 3: Knowledge Base query
    kb_ok = test_knowledge_base_query(client)
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if creds_ok and client and kb_ok:
        print("✅ ALL TESTS PASSED")
        print("   AWS connection is working correctly!")
        return 0
    else:
        print("❌ SOME TESTS FAILED")
        print("   Review errors above and fix configuration")
        return 1

if __name__ == "__main__":
    sys.exit(main())
