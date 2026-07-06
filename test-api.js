require('./backend/src/lib/load-env');
const http = require('http');
const { verifyToken, signToken } = require('./backend/src/utils/jwt');

const token = signToken({ sub: 26, role: 'STUDENT' });
console.log(token);
