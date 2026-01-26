/**
 * Test Script: Forgot Password Email Validation
 * 
 * This script tests that:
 * 1. Emails are ONLY sent to existing users
 * 2. Non-existent emails do NOT receive emails
 */

const testCases = [
    {
        name: 'Valid Email (exists in DB)',
        email: '07raflycall45@gmail.com',
        shouldSendEmail: true
    },
    {
        name: 'Invalid Email (does not exist)',
        email: 'emailpalsu12345@test.com',
        shouldSendEmail: false
    },
    {
        name: 'Another Invalid Email',
        email: 'tidakada@example.com',
        shouldSendEmail: false
    }
];

async function runTests() {
    console.log('='.repeat(60));
    console.log('FORGOT PASSWORD EMAIL VALIDATION TEST');
    console.log('='.repeat(60));
    console.log('');

    for (const testCase of testCases) {
        console.log(`\nTest: ${testCase.name}`);
        console.log(`Email: ${testCase.email}`);
        console.log(`Expected: ${testCase.shouldSendEmail ? 'Email SENT ✅' : 'Email NOT sent ❌'}`);

        try {
            const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: testCase.email })
            });

            const data = await response.json();

            console.log(`Response: ${data.message}`);
            console.log('Check server logs for actual email sending status...');
            console.log('-'.repeat(60));

            // Wait a bit before next test
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETED');
    console.log('='.repeat(60));
    console.log('\nIMPORTANT: Check the server logs above.');
    console.log('You should see:');
    console.log('  - "[EmailService] Email sent" for VALID emails');
    console.log('  - "[ForgotPassword] Request for non-existent/inactive email" for INVALID emails');
    console.log('');
}

runTests();
