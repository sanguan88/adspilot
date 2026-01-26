const { getDatabaseConnection } = require('./lib/db');

async function testEmail() {
    let connection;
    try {
        connection = await getDatabaseConnection();
        const result = await connection.query(
            `SELECT email, username FROM data_user 
       WHERE status_user IN ('aktif', 'active', 'pending_payment') 
       LIMIT 1`
        );

        if (result.rows.length > 0) {
            console.log('Test user found:');
            console.log(JSON.stringify(result.rows[0], null, 2));
        } else {
            console.log('No active users found');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

testEmail();
