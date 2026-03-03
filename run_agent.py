#!/usr/bin/env python3
"""
Simple wrapper to run the FundingForge agent from Node.js
Reads CV text from stdin, outputs JSON to stdout
"""
import sys
import json
import traceback
import io
import os
from dotenv import load_dotenv

# Load environment variables BEFORE importing agents
load_dotenv()

def main():
    try:
        # Validate AWS credentials are loaded
        required_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            raise EnvironmentError(f"Missing required AWS credentials: {', '.join(missing_vars)}")
        
        # Log credential status (without exposing secrets)
        sys.stderr.write(f"✓ AWS credentials loaded: Region={os.getenv('AWS_DEFAULT_REGION')}, "
                        f"Key ID={os.getenv('AWS_ACCESS_KEY_ID')[:10]}...\n")
        sys.stderr.flush()
        
        # Read CV text from stdin with timeout handling
        import select
        
        # Check if stdin has data available (with 1 second timeout)
        if sys.platform == 'win32':
            # Windows doesn't support select on stdin, just read
            cv_text = sys.stdin.read()
        else:
            # Unix-like systems
            if select.select([sys.stdin], [], [], 1.0)[0]:
                cv_text = sys.stdin.read()
            else:
                raise TimeoutError("No input received on stdin within timeout")
        
        if not cv_text or not cv_text.strip():
            raise ValueError("Empty CV text received")
        
        # Import here to catch import errors
        from agents import run_agent
        
        # Redirect stdout to capture agent debug output
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        
        try:
            # Run the agent
            result = run_agent(cv_text)
        finally:
            # Restore stdout
            sys.stdout = old_stdout
        
        # Output ONLY the JSON to stdout
        print(json.dumps(result), flush=True)
        return 0
        
    except ImportError as e:
        error_result = {
            "_parse_error": True,
            "researcher_summary": f"Import error: {str(e)}. Please ensure all dependencies are installed (pip install -r requirements.txt)",
            "matches": [],
            "_error_type": "ImportError",
            "_traceback": traceback.format_exc()
        }
        print(json.dumps(error_result), flush=True)
        return 1
        
    except Exception as e:
        error_result = {
            "_parse_error": True,
            "researcher_summary": f"Error running agent: {str(e)}",
            "matches": [],
            "_error_type": type(e).__name__,
            "_traceback": traceback.format_exc()
        }
        print(json.dumps(error_result), flush=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())
