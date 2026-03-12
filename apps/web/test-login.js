const bcrypt = require('bcryptjs');
const password = 'SuperAdmin@2026';
const hash = '$2b$12$M8V5DVdt9jx8yeUDFpgOJOAXc4P6jZEqYQig/akhKc03SqOOiWEge';

bcrypt.compare(password, hash).then(result => {
  console.log('Password match:', result);
});
