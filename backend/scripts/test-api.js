/**
 * اختبار سريع لمسارات API
 */
const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const login = await request('POST', '/api/auth/login', {
    email: 'admin@tournament.local',
    password: 'Admin@12345',
  });
  console.log('LOGIN', login.status, login.body.success);

  const token = login.body.data.token;

  const create = await request(
    'POST',
    '/api/players',
    {
      full_name: 'محمد علي أحمد الكندي',
      phone: '96891234567',
      is_team_leader: true,
      sport: 'both',
    },
    token
  );
  console.log('CREATE', create.status, create.body);

  const list = await request('GET', '/api/players', null, token);
  console.log('LIST', list.status, list.body.data?.count);
})();
