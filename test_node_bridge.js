// Test the Python bridge from Node.js
import { runPythonAgent } from './server/python-bridge.ts';

const testCV = `
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
`;

console.log('Testing Python agent through Node.js bridge...\n');

runPythonAgent(testCV)
  .then(result => {
    console.log('✓ Success!');
    console.log('\nResearcher Summary:');
    console.log(result.researcher_summary);
    console.log(`\nFound ${result.matches.length} grant matches`);
    result.matches.forEach((match, i) => {
      console.log(`\n${i + 1}. ${match.grant_title} (${match.grant_agency})`);
      console.log(`   Match Score: ${match.grant_match_score}`);
      console.log(`   Collaborator: ${match.collaborator_name}`);
    });
  })
  .catch(error => {
    console.error('✗ Error:', error.message);
    process.exit(1);
  });
