#!/usr/bin/env node

/**
 * Script to generate Auth0 callback URLs for common development ports
 * Copy the output and paste into Auth0 Dashboard -> Applications -> Settings
 */

const commonPorts = [
  3000,  // Common React/Next.js default
  5173,  // Vite default
  5174,  // Vite alternate
  5175,  // Vite alternate
  5176,  // Vite alternate
  8080,  // Common alternative
  8081,  // Common alternative
];

const productionDomains = [
  'https://your-production-domain.com',
  // Add your production domains here
];

function generateUrls() {
  const localhostUrls = commonPorts.map(port => `http://localhost:${port}`);
  const allUrls = [...localhostUrls, ...productionDomains];
  
  return allUrls.join('\n');
}

console.log('=== Auth0 Callback URLs ===');
console.log('Copy and paste these into Auth0 Dashboard:');
console.log('\nAllowed Callback URLs:');
console.log(generateUrls());
console.log('\nAllowed Logout URLs:');
console.log(generateUrls());
console.log('\nAllowed Web Origins:');
console.log(generateUrls());
console.log('\n=== End ===');

