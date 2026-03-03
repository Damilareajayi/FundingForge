import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GrantMatch {
  grant_title: string;
  grant_agency: string;
  grant_match_score: number;
  grant_justification: string;
  collaborator_name: string;
  collaborator_department: string;
  collaborator_synergy_score: number;
  collaborator_justification: string;
  draft_proposal: string;
  draft_email: string;
}

export interface AgentResult {
  researcher_summary: string;
  matches: GrantMatch[];
  _raw?: string;
  _parse_error?: boolean;
}

/**
 * Call the Python agents.py script to run the FundingForge agent
 * This connects to AWS Bedrock Knowledge Bases
 */
export async function runPythonAgent(cvText: string): Promise<AgentResult> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'run_agent.py');
    
    const python = spawn('python', [pythonScript]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      // Log stderr for debugging
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      if (code !== 0) {
        // Try to parse stdout even on error - might contain error JSON
        try {
          const errorResult = JSON.parse(stdout);
          if (errorResult._parse_error) {
            console.error('Python agent error details:', errorResult);
            resolve(errorResult); // Return the error result instead of rejecting
            return;
          }
        } catch {
          // If can't parse, reject with error
        }
        reject(new Error(`Python agent failed (exit code ${code}): ${stderr || 'No error details'}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error}\nOutput: ${stdout}\nStderr: ${stderr}`));
      }
    });
    
    python.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
    
    // Send CV text to Python script via stdin
    python.stdin.write(cvText);
    python.stdin.end();
  });
}
