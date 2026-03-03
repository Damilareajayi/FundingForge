# AWS Setup for FundingForge

## The Problem
The Python agent is failing with: `UnrecognizedClientException: The security token included in the request is invalid`

This means AWS credentials are not configured.

## Solution

### 1. Create `.env` file
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Add Your AWS Credentials
Edit `.env` and add your AWS credentials:

```env
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
AWS_DEFAULT_REGION=us-east-1
```

### 3. Get AWS Credentials

You need AWS credentials with access to:
- Amazon Bedrock (for Claude Sonnet 4.5 model)
- Bedrock Knowledge Bases (IDs: KFW7ZEBGMR, Q89ZCWQSRY, LULFPOFCTD)

#### Option A: AWS IAM User
1. Go to AWS Console → IAM → Users
2. Create a new user or select existing user
3. Create access keys (Security credentials tab)
4. Copy the Access Key ID and Secret Access Key

#### Option B: AWS CLI Configuration
If you have AWS CLI configured, you can use those credentials:
```bash
cat ~/.aws/credentials
```

### 4. Required IAM Permissions

Your AWS user/role needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/us.anthropic.claude-sonnet-4-5-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:Retrieve"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1:*:knowledge-base/KFW7ZEBGMR",
        "arn:aws:bedrock:us-east-1:*:knowledge-base/Q89ZCWQSRY",
        "arn:aws:bedrock:us-east-1:*:knowledge-base/LULFPOFCTD"
      ]
    }
  ]
}
```

### 5. Test the Setup

Run the test script:
```bash
python test_agent.py
```

If successful, you should see:
```
✓ Import successful
✓ Agent execution successful
```

### 6. Restart the Server

After adding credentials, restart your development server:
```bash
npm run dev
```

## Troubleshooting

### "The security token included in the request is invalid"
- Check that your AWS credentials are correct
- Verify the credentials haven't expired (temporary credentials expire)
- Ensure the IAM user/role has the required permissions

### "Access Denied" errors
- Your IAM user needs Bedrock permissions
- Check that Bedrock is available in us-east-1 region
- Verify Knowledge Base IDs are correct

### Still not working?
Check the Python agent logs:
```bash
python test_agent.py 2>&1 | tee agent_debug.log
```
