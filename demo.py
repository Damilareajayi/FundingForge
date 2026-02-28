import boto3
import json
import numpy as np
from dotenv import load_dotenv
import os

# Load AWS credentials from the .env file
load_dotenv()

# Initialize the Bedrock client
# Ensure you have requested access to Titan Embeddings V2 and Claude 3 Haiku in the AWS Console (us-east-1 or us-west-2)
bedrock = boto3.client(service_name='bedrock-runtime', region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'))

# ================= 1. Prepare Mock Data =================
FACULTY_DB = [
    {
        "name": "Dr. Elena Rostova",
        "department": "Mechanical Engineering",
        "text_for_embedding": "Dr. Elena Rostova directs the Advanced Aerodynamics Lab. Her team generates massive amounts of high-fidelity experimental data for fluid dynamics but struggles with the computational bottleneck of traditional simulation methods. Research areas: Fluid Dynamics, Experimental Physics, Turbulence Modeling."
    },
    {
        "name": "Dr. Marcus Vance",
        "department": "Computer Science",
        "text_for_embedding": "Dr. Marcus Vance focuses on cluster-level optimizations and parallel computing infrastructure. Research areas: High Performance Computing, Distributed Systems, GPU Optimization."
    }
]

GRANTS_DB = [
    {
        "title": "AI-Driven Paradigms for Complex Physical Systems (NSF)",
        "text_for_embedding": "This NSF grant supports interdisciplinary teams that combine novel artificial intelligence frameworks with traditional physical sciences. Proposals must demonstrate how AI can accelerate multi-physics simulations or complex fluid modeling. Requires collaboration between computer scientists and physical domain experts."
    },
    {
        "title": "Computational Approaches to Genomic Sequencing (NIH)",
        "text_for_embedding": "Funding for advancing algorithmic efficiency in processing large-scale human genome data."
    }
]

# ================= 2. Core AI Tool Functions =================

def get_embedding(text):
    """Call Amazon Titan to generate text embeddings"""
    print(f"Embedding: {text[:30]}...")
    body = json.dumps({
        "inputText": text,
        "dimensions": 256, # 256 dimensions is sufficient for our MVP and extremely fast
        "normalize": True
    })
    response = bedrock.invoke_model(
        body=body, 
        modelId="amazon.titan-embed-text-v2:0", 
        accept="application/json", 
        contentType="application/json"
    )
    response_body = json.loads(response.get('body').read())
    return np.array(response_body['embedding'])

def calculate_similarity(vec1, vec2):
    """Calculate cosine similarity between two vectors"""
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def generate_synergy_analysis(user_query, top_faculty, top_grant):
    """Call Claude 3 to generate the synergy analysis report"""
    print("\n🚀 Summoning Claude 3 for deep analysis...")
    prompt = f"""
    You are an expert academic matchmaker at Florida State University.
    
    User (PhD Student) Background: {user_query}
    
    Top Matched Faculty: {top_faculty['name']} - {top_faculty['text_for_embedding']}
    Top Matched Grant: {top_grant['title']} - {top_grant['text_for_embedding']}
    
    Task: Write a highly persuasive, 3-sentence "Synergy Analysis" explaining WHY this specific student, faculty member, and grant make a perfect interdisciplinary team. Highlight the complementary strengths.
    """
    
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 500,
        "messages": [{"role": "user", "content": prompt}]
    })
    
    # Using the Haiku model: fast, cost-effective, perfect for Hackathons
    response = bedrock.invoke_model(
        body=body, 
        modelId="us.anthropic.claude-opus-4-6-v1"
    )
    response_body = json.loads(response.get('body').read())
    return response_body['content'][0]['text']

# ================= 3. Run Main Flow =================

if __name__ == "__main__":
    print("=== FSU ScholarSync Matchmaking Engine Started ===")
    
    # Simulate a perfect user input (highly aligned with advanced AI for Science scenarios like equation discovery and symbolic regression)
    user_input = "I am a PhD student working on a neural operator framework and symbolic regression for multi-physics simulations. My AI models can accelerate complex physical predictions, but I need real-world experimental data to validate my framework."
    print(f"\n[User Input]: {user_input}\n")
    
    # 1. Vectorize user input
    user_vector = get_embedding(user_input)
    
    # 2. Match the most suitable faculty member
    best_faculty = None
    max_faculty_score = -1
    for faculty in FACULTY_DB:
        fac_vec = get_embedding(faculty['text_for_embedding'])
        score = calculate_similarity(user_vector, fac_vec)
        if score > max_faculty_score:
            max_faculty_score = score
            best_faculty = faculty
            
    # 3. Match the most suitable grant
    best_grant = None
    max_grant_score = -1
    for grant in GRANTS_DB:
        grant_vec = get_embedding(grant['text_for_embedding'])
        score = calculate_similarity(user_vector, grant_vec)
        if score > max_grant_score:
            max_grant_score = score
            best_grant = grant

    print(f"\n✅ Retrieval Complete!")
    print(f"🥇 Matched Faculty: {best_faculty['name']} (Score: {max_faculty_score:.2f})")
    print(f"🥇 Matched Grant: {best_grant['title']} (Score: {max_grant_score:.2f})")
    
    # 4. Generate the ultimate synergy analysis
    analysis = generate_synergy_analysis(user_input, best_faculty, best_grant)
    
    print("\n" + "="*50)
    print("✨ AI Synergy Analysis ✨")
    print("="*50)
    print(analysis)
    print("="*50)